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
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";

import FolderTree from "./components/FolderTree";
import FileGrid   from "./components/FileGrid";
import MemoryBar  from "./components/MemoryBar";

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

  // ===== initial load =====
  useEffect(() => {
    loadDirectory("/root/PIdisk");
    // подтягиваем текущие настройки
    invoke("get_settings").then((cfg) => {
      setHost(cfg.host);
      setPort(String(cfg.port));
      setUsername(cfg.username);
      setPassword(cfg.password);
      setRootDir(cfg.root_dir);
      setTrashDir(cfg.trash_dir);
    });
  }, []);

  // ===== cd + ls =====
  async function loadDirectory(dir) {
    try {
      const [newPath, list] = await invoke("read_dir", { dir });
      setCurrentPath(newPath);
      setFiles(list);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }

  // ===== context menus =====
  function onFileContext(e, name) {
    e.preventDefault();
    e.stopPropagation();
    setMenu({
      mouseX:   e.clientX + 2,
      mouseY:   e.clientY + 4,
      name,
      isFolder: !/\.[^/.]+$/.test(name),
    });
  }
  function onMainContext(e) {
    e.preventDefault();
    setMenu({ mouseX: e.clientX + 2, mouseY: e.clientY + 4, name: null, isFolder: false });
  }
  const handleClose = () => setMenu(null);

  // ===== menu actions =====
  const handleOpen = (name) => {
    handleClose();
    const next = currentPath === "." ? name : `${currentPath}/${name}`;
    loadDirectory(next);
  };

  const handleDelete = async (name) => {
    handleClose();
    await invoke("rm", { target: name });
    loadDirectory(currentPath);
    setDeletedItem({ parentPath: currentPath, name });
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
    if (newName && newName !== oldName) {
      await invoke("rename", { old: oldName, new: newName });
      await loadDirectory(currentPath);
      setCreatedFolder({ parentPath: currentPath, oldName, newName });
    }
    setRenameTarget(null);
    setRenameValue("");
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
  const handleSettingsSave  = async () => {
    try {
      await invoke("update_settings", {
        host,
        port:     parseInt(port,  10),
        username,
        password,
        root_dir: rootDir,
        trash_dir: trashDir,
      });
      // после смены путей — перезагрузим в новый root_dir
      await loadDirectory(rootDir);
    } catch (e) {
      console.error("Settings save error:", e);
      setError(String(e));
    } finally {
      handleCloseSettings();
    }
  };

  function onPlusClick() {
    fileInputRef.current?.click();
  }

  async function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // передаём именно local_path, а не localPath
      await invoke("upload_file", { localPath: file.path });
      await loadDirectory(currentPath);
    } catch (err) {
      console.error(err);
      setError(String(err));
    } finally {
      e.target.value = "";
    }
  }

  async function handleClearAll() {
    if (!window.confirm("Вы действительно хотите очистить корзину?")) return;
    try {
      await invoke("clear_all");
      // после очистки — перезагрузим ту же папку (она же trashDir)
      await loadDirectory(currentPath);
    } catch (e) {
      console.error(e);
      setError(String(e));
    }
  }
  

  return (
    <Box display="flex" flexDirection="column" height="100vh" width="100vw">
      {/* TOP BAR */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense" sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6">PIdisk</Typography>
          <Box>
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
            <IconButton size="small" color="inherit" onClick={onPlusClick}>
              <AddIcon />
            </IconButton>
  
            {/* Скрытый input для выбора файла */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={onFileChange}
            />
          </Box>
        </Toolbar>
      </AppBar>
  
      {/* SETTINGS DIALOG */}
      <Dialog open={openSettings} onClose={handleCloseSettings} maxWidth="sm" fullWidth>
        <DialogTitle>Настройки подключения</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {/* поля для host, port, username, password, rootDir, trashDir */}
          <TextField label="IP-адрес"       value={host}     onChange={e => setHost(e.target.value)}       fullWidth />
          <TextField label="Порт"           value={port}     onChange={e => setPort(e.target.value)}       fullWidth type="number" />
          <TextField label="Пользователь"   value={username} onChange={e => setUsername(e.target.value)} fullWidth />
          <TextField label="Пароль"         value={password} onChange={e => setPassword(e.target.value)} fullWidth type="password" />
          <TextField label="Корневой каталог" value={rootDir} onChange={e => setRootDir(e.target.value)}  fullWidth />
          <TextField label="Путь к корзине"   value={trashDir} onChange={e => setTrashDir(e.target.value)} fullWidth />
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
            />
          </Box>
          <Box p={1} borderTop={1} borderColor="divider">
            <MemoryBar />
          </Box>
        </Box>
  
        {/* RIGHT PANEL */}
        <Box flex={1} p={2} overflow="auto" onContextMenu={onMainContext}>
          {error && <Box color="error.main" mb={1}>{error}</Box>}
          <FileGrid
            items={files}
            onDoubleClick={name => {
              if (!/\.[^/.]+$/.test(name)) handleOpen(name);
            }}
            onContextMenu={onFileContext}
            renameTarget={renameTarget}
            renameValue={renameValue}
            onRenameChange={setRenameValue}
            onRenameConfirm={handleRenameConfirm}
          />
          <Menu
            open={!!menu}
            onClose={handleClose}
            anchorReference="anchorPosition"
            anchorPosition={
              menu ? { top: menu.mouseY, left: menu.mouseX } : undefined
            }
          >
            {menu?.name ? (
              <>
                {menu.isFolder && (
                  <MenuItem onClick={() => handleOpen(menu.name)}>Открыть</MenuItem>
                )}
                <MenuItem onClick={() => handleRenameMenu(menu.name)}>
                  Переименовать
                </MenuItem>
                <MenuItem onClick={() => handleDelete(menu.name)}>Удалить</MenuItem>
              </>
            ) : (
              <MenuItem onClick={handleNewFolder}>Новая папка</MenuItem>
            )}
          </Menu>
        </Box>
      </Box>
    </Box>
  );
}