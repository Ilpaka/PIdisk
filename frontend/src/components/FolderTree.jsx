// src/components/FolderTree.jsx
import React, { useState, useEffect } from "react";
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import FolderIcon           from "@mui/icons-material/Folder";
import FolderOpenIcon       from "@mui/icons-material/FolderOpen";
import InsertDriveFileIcon  from "@mui/icons-material/InsertDriveFile";
import { invoke }           from "@tauri-apps/api/core";

// Помощник для поиска узла по пути
function findNode(nodes, path) {
  for (const n of nodes) {
    if (n.path === path) return n;
    if (n.children) {
      const found = findNode(n.children, path);
      if (found) return found;
    }
  }
  return null;
}

export default function FolderTree({
  currentPath,
  onNavigate,
  onDropFile,
  createdFolder,
  onFolderCreated,
  deletedItem,     
  onItemDeleted,
  trashDir,
  trashCleared,
  onTrashCleared,   
}) {
  const ROOT = "/root/PIdisk";
  const [tree, setTree] = useState([
    { name: "PIdisk", path: ROOT, children: null, open: false, isFolder: true },
  ]);

  // При смене currentPath — раскрываем все сегменты
  useEffect(() => {
    const segs = currentPath
      .split("/")
      .filter(Boolean)
      .filter((s, i) => !(i === 0 && s === "root"));

    async function expandAll() {
      let nodes = tree;
      let acc   = "";
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        acc = i === 0 ? ROOT : `${acc}/${seg}`;
        const node = nodes.find((n) => n.name === seg);
        if (!node) break;
        if (node.isFolder && node.children === null) {
          const [ , list ] = await invoke("read_dir", { dir: node.path });
          node.children = list.map((n) => ({
            name: n,
            path: `${node.path}/${n}`,
            children: null,
            open: false,
            isFolder: !/\.[^/.]+$/.test(n),
          }));
        }
        node.open = true;
        nodes = node.children || [];
      }
      setTree([...tree]);
    }

    expandAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath]);

  // Вставка / переименование узла
  useEffect(() => {
    if (!createdFolder) return;
    const { parentPath, oldName, newName } = createdFolder;
    const parent = findNode(tree, parentPath);
    if (parent && parent.children) {
      if (oldName) {
        // переименование
        const child = parent.children.find((c) => c.name === oldName);
        if (child) {
          child.name = newName;
          child.path = `${parentPath}/${newName}`;
        }
      } else {
        // новая папка
        parent.children.push({
          name: newName,
          path: `${parentPath}/${newName}`,
          children: null,
          open: false,
          isFolder: true,
        });
      }
      setTree([...tree]);
    }
    onFolderCreated();
  }, [createdFolder, onFolderCreated, tree]);

  // **Удаление** узла
  useEffect(() => {
    if (!deletedItem) return;
    const { parentPath, name } = deletedItem;
    const parent = findNode(tree, parentPath);
    if (parent && parent.children) {
      parent.children = parent.children.filter((c) => c.name !== name);
      setTree([...tree]);
    }
    onItemDeleted();
  }, [deletedItem, onItemDeleted, tree]);

  useEffect(() => {
    if (!trashCleared) return;
    // найдём узел корзины
    const node = findNode(tree, trashDir);
    if (node && node.isFolder) {
      node.children = [];      // сброс
      node.open = true;        // оставить раскрытой
    setTree([...tree]);
    }
    onTrashCleared();
    }, [trashCleared, trashDir, tree, onTrashCleared]);

  // Клик раскрыть / свернуть
  const toggle = async (node) => {
    if (!node.isFolder) return;
    if (node.children === null) {
      const [ , list ] = await invoke("read_dir", { dir: node.path });
      node.children = list.map((n) => ({
        name: n,
        path: `${node.path}/${n}`,
        children: null,
        open: false,
        isFolder: !/\.[^/.]+$/.test(n),
      }));
    }
    node.open = !node.open;
    setTree([...tree]);
  };

  // Рекурсивный рендер
  const renderNode = (node, depth = 0) => (
    <React.Fragment key={node.path}>
      <ListItemButton
        sx={{ pl: 2 + depth * 2 }}
        onClick={() => toggle(node)}
        onDoubleClick={() => node.isFolder && onNavigate(node.path)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const src = e.dataTransfer.getData("text/plain");
          onDropFile(src, node.path);
        }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          {node.isFolder
            ? node.open
              ? <FolderOpenIcon />
              : <FolderIcon />
            : <InsertDriveFileIcon />}
        </ListItemIcon>
        <ListItemText primary={node.name} />
      </ListItemButton>
      {node.open && node.children && (
        <List disablePadding>
          {node.children.map((child) => renderNode(child, depth + 1))}
        </List>
      )}
    </React.Fragment>
  );

  return (
    <List dense disablePadding sx={{ height: "100%" }}>
      {tree.map((n) => renderNode(n))}
    </List>
  );
}
