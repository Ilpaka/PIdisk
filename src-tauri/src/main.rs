// src-tauri/src/main.rs
#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use ssh2::Session;
use std::io::Read;
use std::net::TcpStream;
use std::sync::Mutex;
use tauri::command;
use std::fs::File;
use std::io::{Write, BufWriter};

/// SSH-настройки + корень и корзина
#[derive(Serialize, Deserialize, Clone)]
struct Settings {
  host: String,
  port: u16,
  username: String,
  password: String,
  root_dir: String,
  trash_dir: String,
}

/// Глобальные настройки
static SETTINGS: Lazy<Mutex<Settings>> = Lazy::new(|| {
  Mutex::new(Settings {
    host: "138.124.14.1".into(),
    port: 22,
    username: "root".into(),
    password: "UHxeVf4KXDHz".into(),
    root_dir: "/root/PIdisk".into(),
    trash_dir: "/root/PIdisk/Bin".into(),
  })
});

/// Текущая SSH-сессия (None → нужно создать)
static SSH_SESSION: Lazy<Mutex<Option<Session>>> = Lazy::new(|| Mutex::new(None));

/// Текущая директория, по умолчанию — settings.root_dir
static CURRENT_DIR: Lazy<Mutex<String>> = Lazy::new(|| {
  let cfg = SETTINGS.lock().unwrap();
  Mutex::new(cfg.root_dir.clone())
});

/// Создаёт новую SSH-сессию по SETTINGS
fn create_session(cfg: &Settings) -> Result<Session, String> {
  let addr = format!("{}:{}", cfg.host, cfg.port);
  let tcp = TcpStream::connect(&addr).map_err(|e| e.to_string())?;
  let mut sess = Session::new().map_err(|e| e.to_string())?;
  sess.set_tcp_stream(tcp);
  sess.handshake().map_err(|e| e.to_string())?;
  sess
    .userauth_password(&cfg.username, &cfg.password)
    .map_err(|e| e.to_string())?;
  Ok(sess)
}

/// Утилита: берёт или создаёт SSH_SESSION и даёт его в замыкание
fn with_session<F, R>(f: F) -> Result<R, String>
where
  F: FnOnce(&mut Session) -> Result<R, String>,
{
  let mut guard = SSH_SESSION.lock().unwrap();
  if guard.is_none() {
    let cfg = SETTINGS.lock().unwrap().clone();
    *guard = Some(create_session(&cfg)?);
  }
  let sess = guard.as_mut().unwrap();
  f(sess)
}

// ----------------------
// Команды для фронта
// ----------------------

/// Вернуть текущие настройки
#[command]
fn get_settings() -> Settings {
  SETTINGS.lock().unwrap().clone()
}

/// Обновить настройки и пересоздать SSH-сессию + сбросить текущую папку
#[command]
fn update_settings(
  host: String,
  port: u16,
  username: String,
  password: String,
) -> Result<(), String> {
  // 1) пробуем подключиться по новым данным
  let mut trial = SETTINGS.lock().unwrap().clone();
  trial.host = host.clone();
  trial.port = port;
  trial.username = username.clone();
  trial.password = password.clone();
  let sess = create_session(&trial)
    .map_err(|e| format!("Неверные данные для подключения: {}", e))?;
  // 2) записываем их в SETTINGS
  {
    let mut cfg = SETTINGS.lock().unwrap();
    cfg.host = host;
    cfg.port = port;
    cfg.username = username;
    cfg.password = password;
    // root_dir и trash_dir остаются прежними
  }
  // 3) меняем сессию
  *SSH_SESSION.lock().unwrap() = Some(sess);
  // 4) сбрасываем cwd на старый root_dir
  let root = SETTINGS.lock().unwrap().root_dir.clone();
  *CURRENT_DIR.lock().unwrap() = root;
  Ok(())
}

/// cd + pwd + ls -1 → (новый путь, список)
#[command]
fn read_dir(dir: String) -> Result<(String, Vec<String>), String> {
  with_session(|sess| {
    let cmd = format!("cd '{}' && pwd && ls -1", dir);
    let mut ch = sess.channel_session().map_err(|e| e.to_string())?;
    ch.exec(&cmd).map_err(|e| e.to_string())?;
    let mut out = String::new();
    ch.read_to_string(&mut out).map_err(|e| e.to_string())?;
    ch.close().map_err(|e| e.to_string())?;
    ch.wait_close().map_err(|e| e.to_string())?;
    let mut lines = out.lines();
    let new_path = lines.next().unwrap_or(&dir).to_string();
    let list = lines.map(String::from).collect();
    *CURRENT_DIR.lock().unwrap() = new_path.clone();
    Ok((new_path, list))
  })
}

/// mkdir в текущей папке
#[command]
fn mkdir(name: String) -> Result<(), String> {
  with_session(|sess| {
    let cwd = CURRENT_DIR.lock().unwrap().clone();
    let mut ch = sess.channel_session().map_err(|e| e.to_string())?;
    ch.exec(&format!("cd '{}' && mkdir '{}'", cwd, name))
      .map_err(|e| e.to_string())?;
    ch.close().map_err(|e| e.to_string())?;
    ch.wait_close().map_err(|e| e.to_string())?;
    Ok(())
  })
}

/// mv (переименовать или переместить)
#[command]
fn mv(src: String, dest: String) -> Result<(), String> {
  with_session(|sess| {
    let cwd = CURRENT_DIR.lock().unwrap().clone();
    let src_full = if src.starts_with('/') {
      src
    } else {
      format!("{}/{}", cwd, src)
    };
    let dest_full = if dest.starts_with('/') {
      dest
    } else {
      format!("{}/{}", cwd, dest)
    };
    let cmd = format!("sh -lc \"mv '{}' '{}'\"", src_full, dest_full);
    let mut ch = sess.channel_session().map_err(|e| e.to_string())?;
    ch.exec(&cmd).map_err(|e| e.to_string())?;
    ch.close().map_err(|e| e.to_string())?;
    ch.wait_close().map_err(|e| e.to_string())?;
    Ok(())
  })
}

/// rm: в trash_dir или удаление внутри корзины
#[command]
fn rm(target: String) -> Result<(), String> {
  with_session(|sess| {
    // создаём корзину при необходимости
    let trash = SETTINGS.lock().unwrap().trash_dir.clone();
    {
      let mut c0 = sess.channel_session().map_err(|e| e.to_string())?;
      c0.exec(&format!("mkdir -p '{}'", trash))
        .map_err(|e| e.to_string())?;
      c0.close().map_err(|e| e.to_string())?;
      c0.wait_close().map_err(|e| e.to_string())?;
    }
    let cwd = CURRENT_DIR.lock().unwrap().clone();
    let cmd = if cwd == trash {
      format!("sh -lc \"cd '{}' && rm -rf '{}'\"", trash, target)
    } else {
      let src_full = format!("{}/{}", cwd, target);
      format!("sh -lc \"cd '{}' && mv '{}' '{}'\"", cwd, src_full, trash)
    };
    let mut ch = sess.channel_session().map_err(|e| e.to_string())?;
    ch.exec(&cmd).map_err(|e| e.to_string())?;
    ch.close().map_err(|e| e.to_string())?;
    ch.wait_close().map_err(|e| e.to_string())?;
    Ok(())
  })
}

/// clear_all внутри trash_dir
#[command]
fn clear_all() -> Result<(), String> {
  let trash = SETTINGS.lock().unwrap().trash_dir.clone();
  with_session(|sess| {
    let mut ch = sess.channel_session().map_err(|e| e.to_string())?;
    let cmd = format!("cd '{}' && rm -rf ./*", trash);
    ch.exec(&cmd).map_err(|e| e.to_string())?;
    ch.close().map_err(|e| e.to_string())?;
    ch.wait_close().map_err(|e| e.to_string())?;
    Ok(())
  })
}

/// df -h текущей папки
#[command]
fn df() -> Result<String, String> {
  with_session(|sess| {
    let cwd = CURRENT_DIR.lock().unwrap().clone();
    let mut ch = sess.channel_session().map_err(|e| e.to_string())?;
    ch.exec(&format!("cd '{}' && df -h .", cwd))
      .map_err(|e| e.to_string())?;
    let mut out = String::new();
    ch.read_to_string(&mut out).map_err(|e| e.to_string())?;
    Ok(out)
  })
}

#[command]
fn upload_file(filename: String, data: Vec<u8>) -> Result<(), String> {
  // 1) определяем, куда сохраняем
  let cwd = CURRENT_DIR.lock().unwrap().clone();
  let remote_path = std::path::Path::new(&cwd).join(&filename);

  // 2) через SCP отправляем байты
  with_session(|sess| {
    let size = data.len() as u64;
    let mut remote = sess
      .scp_send(&remote_path, 0o644, size, None)
      .map_err(|e| e.to_string())?;
    std::io::Write::write_all(&mut remote, &data)
      .map_err(|e| e.to_string())?;
    Ok(())
  })
}

#[command]
fn download_and_save(server_file_name: String, save_path: String) -> Result<(), String> {
    // Получаем базовую директорию из CURRENT_DIR
    let base_dir = CURRENT_DIR.lock().unwrap().clone();

    // Формируем полный путь к файлу на сервере
    let full_server_path = std::path::Path::new(&base_dir).join(&server_file_name);

    let file = File::create(&save_path).map_err(|e| e.to_string())?;
    let mut writer = BufWriter::new(file);

    with_session(|sess| {
        let sftp = sess.sftp().map_err(|e| e.to_string())?;
        // Открываем файл по полному пути
        let mut remote = sftp.open(full_server_path.to_str().unwrap()).map_err(|e| {
            let err_msg = format!("Failed to open remote file '{:?}': {}", full_server_path, e);
            println!("{}", err_msg);
            err_msg
        })?;
        let mut buf = [0u8; 16 * 1024];
        loop {
            let n = remote.read(&mut buf).map_err(|e| e.to_string())?;
            if n == 0 { break; }
            writer.write_all(&buf[..n]).map_err(|e| e.to_string())?;
        }
        Ok(())
    })?;

    Ok(())
}


#[command]
fn rename(old: String, new: String) -> Result<(), String> {
  // берём текущий рабочий каталог
  let cwd = CURRENT_DIR.lock().unwrap().clone();
  // формируем команду mv
  let cmd = format!(
    "sh -lc \"cd '{}' && mv '{}' '{}'\"",
    cwd, old, new
  );

  // выполняем её в рамках SSH-сессии
  with_session(|sess| {
    let mut ch = sess.channel_session().map_err(|e| e.to_string())?;
    ch.exec(&cmd).map_err(|e| e.to_string())?;
    ch.close().map_err(|e| e.to_string())?;
    ch.wait_close().map_err(|e| e.to_string())?;
    Ok(())
  })
}


fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      get_settings,
      update_settings,
      read_dir,
      rename,
      mkdir,
      mv,
      rm,
      clear_all,
      df,
      upload_file,
      download_and_save
    ])
    .run(tauri::generate_context!())
    .expect("error while running Tauri application");
}
