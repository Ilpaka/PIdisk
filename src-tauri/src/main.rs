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
use std::path::Path;
use std::fs::File;

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
  root_dir: String,
  trash_dir: String,
) -> Result<(), String> {
  let mut cfg = SETTINGS.lock().unwrap();
  *cfg = Settings { host, port, username, password, root_dir: root_dir.clone(), trash_dir };
  // пересоздаём сессию
  let new_sess = create_session(&cfg)?;
  *SSH_SESSION.lock().unwrap() = Some(new_sess);
  // обновляем текущую директорию стартовой
  *CURRENT_DIR.lock().unwrap() = root_dir;
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
  with_session(|sess| {
    let trash = SETTINGS.lock().unwrap().trash_dir.clone();
    let mut ch = sess.channel_session().map_err(|e| e.to_string())?;
    ch.exec(&format!("sh -lc \"cd '{}' && rm -rf ./*\"", trash))
      .map_err(|e| e.to_string())?;
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
fn upload_file(local_path: String) -> Result<(), String> {
  // открываем локальный файл
  let mut file = File::open(&local_path).map_err(|e| e.to_string())?;
  let metadata = file.metadata().map_err(|e| e.to_string())?;
  let size = metadata.len();
  // получаем имя файла из пути
  let filename = Path::new(&local_path)
    .file_name()
    .and_then(|n| n.to_str())
    .ok_or_else(|| "Неверное имя файла".to_string())?;
  // формируем полный удалённый путь
  let cwd = CURRENT_DIR.lock().unwrap().clone();
  let remote_path = format!("{}/{}", cwd, filename);

  // делаем SCP
  with_session(|sess| {
    let mut remote = sess
      .scp_send(Path::new(&remote_path), 0o644, size, None)
      .map_err(|e| e.to_string())?;
    std::io::copy(&mut file, &mut remote).map_err(|e| e.to_string())?;
    Ok(())
  })
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
      upload_file
    ])
    .run(tauri::generate_context!())
    .expect("error while running Tauri application");
}
