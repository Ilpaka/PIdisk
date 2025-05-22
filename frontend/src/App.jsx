// src/App.jsx
import React, { useState, useEffect, useRef } from "react";
import { invoke }                         from "@tauri-apps/api/core";
import {
  Box,
  Menu,
  MenuItem,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import AddIcon      from "@mui/icons-material/Add";
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

const { save } = window.__TAURI__.dialog;
const { open } = window.__TAURI__.dialog;

import FolderTree from "./components/FolderTree";
import FileGrid   from "./components/FileGrid";
import MemoryBar  from "./components/MemoryBar";

function renderBreadcrumbs(currentPath, onNavigate) {
  const pathSegments = currentPath.replace(/^\/+/, '').split('/');
  let crumbs = [];
  let accPath = '';
  pathSegments.forEach((seg, idx) => {
    accPath += '/' + seg;
    crumbs.push({
      name: seg,
      path: accPath
    });
  });

  return (
    <Breadcrumbs aria-label="breadcrumb" separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 1 }}>
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return isLast ? (
          <Typography color="text.primary" key={crumb.path} noWrap>
            {crumb.name}
          </Typography>
        ) : (
          <Link
            key={crumb.path}
            color="inherit"
            underline="hover"
            sx={{ cursor: 'pointer' }}
            onClick={e => {
              e.preventDefault();
              onNavigate(crumb.path);
            }}
            noWrap
            href="#"
          >
            {crumb.name}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}


export default function App() {
  // ===== states =====
  const [files, setFiles]                = useState([]);
  const [currentPath, setCurrentPath]   = useState(".");
  const [error, setError]               = useState(null);
  const [menu, setMenu]                 = useState(null);
  const [createdFolder, setCreatedFolder] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue,  setRenameValue]  = useState("");
  const [deletedItem,  setDeletedItem]  = useState(null);
  const fileInputRef = useRef(null);
  // ===== settings dialog state =====
  const [openSettings, setOpenSettings] = useState(false);
  const [host,     setHost]     = useState("");
  const [port,     setPort]     = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rootDir,  setRootDir]  = useState("");
  const [trashDir, setTrashDir] = useState("");
  const [trashCleared, setTrashCleared] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [snackbar, setSnackbar] = useState({open: false, message: '', severity: 'success'});
  const [selectedFiles, setSelectedFiles] = useState([]);

  const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
  });

  // ===== initial load =====
  useEffect(() => {
    loadDirectory("/root/PIdisk");
    invoke("get_settings")
      .then(cfg => {
        setHost(cfg.host);
        setPort(cfg.port);
        setUsername(cfg.username);
        setPassword(cfg.password);
        setTrashDir(cfg.trash_dir);
      })
      .catch(e => setError(String(e)));
  }, []);


  // ===== cd + ls =====
  async function loadDirectory(dir) {
    try {
      const [newPath, list] = await invoke("read_dir", { dir });
      setCurrentPath(newPath);
      setFiles(list);
      setSelectedFiles([]);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }

  // ===== context menus =====
  function onFileContext(e, name) {
  e.preventDefault();
  e.stopPropagation();
  // Проверяем: клик по выделенному и выделено больше одного?
  const isMultiSelected = selectedFiles.length > 1 && selectedFiles.includes(name);
  setMenu({
    mouseX:   e.clientX + 2,
    mouseY:   e.clientY + 4,
    name,
    isFolder: !/\.[^/.]+$/.test(name),
    multi: isMultiSelected, // добавляем флаг!
  });
}

  function onMainContext(e) {
    e.preventDefault();
    setMenu({ mouseX: e.clientX + 2, mouseY: e.clientY + 4, name: null, isFolder: false });
  }

  function showSnackbar(message, severity = 'success') {
    setSnackbar({ open: true, message, severity });
  }

  const handleClose = () => setMenu(null);

  // ===== menu actions =====
  const handleOpen = (name) => {
    handleClose();
    const next = currentPath === "." ? name : `${currentPath}/${name}`;
    loadDirectory(next);
  };

  const handleDownloadFolder = async (name) => {
  handleClose();
  try {
    // Запрашиваем у пользователя, куда сохранить папку
    const folderPath = await open({
      directory: true,
      multiple: false,
      title: "Выберите папку для сохранения"
    });
    if (!folderPath) return; // пользователь отменил выбор

    // Формируем путь для сохранения (папка назначения + имя скачиваемой папки)
    const savePath = `${folderPath}/${name}`;

    // Вызываем Rust-функцию
    await invoke('download_folder', {
      serverFolderName: name,
      savePath: savePath,
    });

    showSnackbar('Папка скачана!', 'success');
  } catch (err) {
    showSnackbar('Ошибка при скачивании папки!', 'error');
  }
};

  const handleDelete = async (name) => {
    handleClose();
    try{
    await invoke("rm", { target: name });
    loadDirectory(currentPath);
    setDeletedItem({ parentPath: currentPath, name });
    showSnackbar('Файл(-ы) удалён(-ы)!', 'success');
    } catch (e){
      showSnackbar('Ошибка при удаление!', 'error');
    }
  };

  const handleDeleteSelected = async () => {
  handleClose();
  if (!selectedFiles.length) return;
  try {
    // Если хотите подтверждение - используйте MUI Dialog, а не window.confirm
    // Например, можно просто удалить без подтверждения:
    for (const name of selectedFiles) {
      await invoke("rm", { target: name });
    }
    await loadDirectory(currentPath);
    setDeletedItem({ parentPath: currentPath, names: selectedFiles });
    showSnackbar('Файлы удалены!', 'success');
  } catch (e) {
    showSnackbar('Ошибка при удалении!', 'error');
  }
};

  const handleRenameMenu = (name) => {
    handleClose();
    setTimeout(() => {
      setRenameTarget(name);
      setRenameValue(name);
    }, 0);
  };

  const handleRenameConfirm = async () => {
  if (!renameTarget) return;
  const oldName = renameTarget;
  const newName = renameValue.trim();

  setRenameTarget(null);
  setRenameValue("");

  // Проверяем, есть ли такой файл/папка уже
  if (newName && newName !== oldName) {
    if (files.includes(newName)) {
      showSnackbar("Файл или папка с таким именем уже есть!", "error");
      return;
    }
    try {
      await invoke("rename", { old: oldName, new: newName });
      showSnackbar("Файл переименован!", "success");
      setCreatedFolder({ parentPath: currentPath, oldName, newName });
    } catch (e) {
      showSnackbar("Ошибка при переименовании!", "error");
      setError(String(e));
    }
  }
  await loadDirectory(currentPath);
};


  const handleNewFolder = async () => {
    handleClose();
    const base = "новая папка";
    let idx = 1, def = base;
    const exists = new Set(files);
    while (exists.has(def)) {
      idx++;
      def = `${base} ${idx}`;
    }
    await invoke("mkdir", { name: def });
    await loadDirectory(currentPath);
    setCreatedFolder({ parentPath: currentPath, newName: def });
    setTimeout(() => {
      setRenameTarget(def);
      setRenameValue(def);
    }, 0);
  };

  // ===== settings dialog handlers =====
  const handleOpenSettings  = () => setOpenSettings(true);
  const handleCloseSettings = () => setOpenSettings(false);

  const handleSettingsSave = async () => {
    try {
      // передаём только четыре параметра
      await invoke("update_settings", {
        host,
        port,
        username,
        password,
      });
      setOpenSettings(false);
      showSnackbar('Успешно!', 'success');
      await loadDirectory(currentPath);
    } catch (e) {
      setError(
        String(e).includes("Неверные данные")
          ? "Неверные данные для подключения"
          : String(e)
      );
    }
  };
  
  const handleUploadClick = async () => {
  // создаём скрытый input «на лету»
  const inp = document.createElement("input");
  inp.type = "file";
  inp.multiple = true; // разрешаем множественный выбор файлов
  inp.onchange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const buf = await file.arrayBuffer();
        const bytes = Array.from(new Uint8Array(buf));
        await invoke("upload_file", {
          filename: file.name,
          data: bytes,
        });
      }
      showSnackbar('Загрузка завершена!', 'success');
      await loadDirectory(currentPath);
    } catch (err) {
      showSnackbar('Ошибка при загрузке!', 'error');
    }
  };
  inp.click();
};

  const handleDownload = async (fileName) => {
    try {
      const savePath = await save({ defaultPath: fileName });
      if (!savePath) return;
      handleClose();
      await invoke('download_and_save', {
        serverFileName: fileName,
        savePath,
      });
      showSnackbar('Файл(-ы) скачен(-ы)!', 'success');
    } catch (err) {
      showSnackbar('Ошибка при скачивание!', 'error');
    }
  };

const handleDownloadSelected = async () => {
  if (!selectedFiles.length) return;
  // Если выделен только один файл - используем стандартное скачивание
  if (selectedFiles.length === 1) {
    await handleDownload(selectedFiles[0]);
    return;
  }
  // Несколько файлов - спрашиваем папку
  try {
    const folderPath = await open({
      directory: true,
      multiple: false,
      title: "Выберите папку для сохранения файлов"
    });
    if (!folderPath) return;
    handleClose();
    for (const fileName of selectedFiles) {
      const savePath = `${folderPath}/${fileName}`;
      await invoke('download_and_save', {
        serverFileName: fileName,
        savePath,
      });
    }
    showSnackbar('Файлы скачаны!', 'success');
  } catch (err) {
    showSnackbar('Ошибка при скачивании!', 'error');
  }
};


  async function handleClearAll() {
    console.log("🔔 handleClearAll вызван, очищаем корзину:", currentPath);
    try {
      await invoke("clear_all");
      showSnackbar('Корзина очищена!', 'success');
    // после очистки — перезагрузим корзину
      await loadDirectory(currentPath);
      setTrashCleared(true);  
    } catch (e) {
      showSnackbar('Ошибка при очистке корзины!', 'error');
    }
    }

  return (
    <Box display="flex" flexDirection="column" height="100vh" width="100vw">
      {/* TOP BAR */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense" sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6">PIdisk</Typography>
          <Box>
          <IconButton
            size="small"
            color={viewMode === "grid" ? "primary" : "inherit"}
            onClick={() => setViewMode("grid")}
            title="Сетка"
          >
           <ViewModuleIcon />
          </IconButton>
          <IconButton
            color={viewMode === "list" ? "primary" : "default"}
            onClick={() => setViewMode("list")}
            title="Показать списком"
          >
          <ViewListIcon />
          </IconButton>
            {/* Кнопка настроек */}
            <IconButton size="small" color="inherit" onClick={handleOpenSettings}>
              <SettingsIcon />
            </IconButton>
  
            {/* Кнопка очистки корзины — только если мы в trashDir */}
            {currentPath === trashDir && (
              <IconButton size="small" color="inherit" onClick={handleClearAll}>
                <DeleteSweepIcon />
              </IconButton>
            )}
  
            {/* Кнопка загрузки файла */}
            <IconButton size="small" onClick={handleUploadClick}>
              <AddIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
  
      {/* SETTINGS DIALOG */}
      <Dialog open={openSettings} onClose={handleCloseSettings} maxWidth="xs" fullWidth>
        <DialogTitle>Настройки</DialogTitle>
        <DialogContent sx={{display:"flex",flexDirection:"column",gap:2,pt:1}}>
          <TextField label="IP-адрес"     value={host}     onChange={e=>setHost(e.target.value)}     fullWidth/>
          <TextField label="Порт"         value={port}     onChange={e=>setPort(+e.target.value)}     fullWidth type="number"/>
          <TextField label="Пользователь" value={username} onChange={e=>setUsername(e.target.value)} fullWidth/>
          <TextField label="Пароль"       value={password} onChange={e=>setPassword(e.target.value)} fullWidth type="password"/>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSettings}>Отмена</Button>
          <Button variant="contained" onClick={handleSettingsSave}>Сохранить</Button>
        </DialogActions>
      </Dialog>
  
      {/* MAIN LAYOUT */}
      <Box display="flex" flexGrow={1}>
        {/* LEFT PANEL */}
        <Box
          width="25%"
          borderRight={1}
          borderColor="divider"
          display="flex"
          flexDirection="column"
        >
          {/* контейнер с деревом — flex:1 и scroll */}
          <Box
            flex="1 1 auto"
            sx={{ height: 0, overflowY: "auto" }}
          >
            <FolderTree
              currentPath={currentPath}
              onNavigate={loadDirectory}
              onDropFile={async (src, dest) => {
                await invoke("mv", { src, dest });
                await loadDirectory(currentPath);
                setCreatedFolder({ parentPath: currentPath, newName: src });
              }}
              createdFolder={createdFolder}
              onFolderCreated={() => setCreatedFolder(null)}
              deletedItem={deletedItem}
              onItemDeleted={() => setDeletedItem(null)}
              trashDir={trashDir}
              trashCleared={trashCleared}
              onTrashCleared={() => setTrashCleared(false)}
            />
          </Box>
          <Box p={1} borderTop={1} borderColor="divider">
            <MemoryBar />
          </Box>
        </Box>
  
        {/* RIGHT PANEL */}
        <Box flex={1} p={2} overflow="auto" onContextMenu={onMainContext} sx={{height: "calc(100vh - 48px)" ,overflow: "auto"}}>
          {error && <Box color="error.main" mb={1}>{error}</Box>}
          {renderBreadcrumbs(currentPath, loadDirectory)}
          <FileGrid
            items={files}
            onDoubleClick={handleOpen}
            onContextMenu={onFileContext}
            renameTarget={renameTarget}
            renameValue={renameValue}
            onRenameChange={setRenameValue}
            onRenameConfirm={handleRenameConfirm}
            viewMode={viewMode}
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
          />                    
          <Menu
  open={!!menu}
  onClose={handleClose}
  anchorReference="anchorPosition"
  anchorPosition={menu ? { top: menu.mouseY, left: menu.mouseX } : undefined}
>
  {menu?.name ? (
    // Если клик по выделенному и выделено больше одного файла
    selectedFiles.length > 1 && selectedFiles.includes(menu.name) ? (
      <>
        <MenuItem onClick={handleDownloadSelected}>
          Скачать выделенное ({selectedFiles.length})
        </MenuItem>
        <MenuItem onClick={handleDeleteSelected}>
          Удалить выделенное ({selectedFiles.length})
        </MenuItem>
      </>
    ) : (
      <>
        {menu.isFolder && (
          <MenuItem onClick={() => handleOpen(menu.name)}>Открыть</MenuItem>
        )}
        <MenuItem onClick={() => handleDownloadFolder(menu.name)}>Скачать папку</MenuItem>
        <MenuItem onClick={() => handleDownload(menu.name)}>Скачать</MenuItem>
        <MenuItem onClick={() => {setRenameTarget(menu.name); setRenameValue(menu.name); handleClose();}}>Переименовать</MenuItem>
        <MenuItem onClick={() => handleDelete(menu.name)}>Удалить</MenuItem>
      </>
    )
  ) : (
    <MenuItem onClick={handleNewFolder}>Новая папка</MenuItem>
  )}
</Menu>


        </Box>
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>  
    </Box>
  );
}