// src/components/FolderTree.jsx
import React, { useState, useEffect } from "react";
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { invoke } from "@tauri-apps/api/core";

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

// Рекурсивное обновление open у узлов: открываем только те, что на пути currentPath
function updateOpenState(nodes, currentPath) {
  return nodes.map((node) => {
    const isOnPath = currentPath.startsWith(node.path);
    let children = node.children;

    if (children) {
      children = updateOpenState(children, currentPath);
    }

    return {
      ...node,
      open: isOnPath,
      children,
    };
  });
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

  // При смене currentPath - обновляем open и загружаем детей
  useEffect(() => {
    async function expandAll() {
      // 1. Обновляем open у всех узлов: открываем только путь к currentPath
      let newTree = updateOpenState(tree, currentPath);

      // 2. Рекурсивно загружаем детей для открытых папок без children
      async function loadChildren(nodes) {
        for (const node of nodes) {
          if (node.open && node.isFolder && node.children === null) {
            const [, list] = await invoke("read_dir", { dir: node.path });
            node.children = list.map((n) => ({
              name: n,
              path: `${node.path}/${n}`,
              children: null,
              open: false,
              isFolder: !/\.[^/.]+$/.test(n),
            }));
            await loadChildren(node.children);
          } else if (node.children) {
            await loadChildren(node.children);
          }
        }
      }

      await loadChildren(newTree);
      setTree([...newTree]);
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

  // Удаление узла
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

  // Очистка корзины
  useEffect(() => {
    if (!trashCleared) return;
    const node = findNode(tree, trashDir);
    if (node && node.isFolder) {
      node.children = [];
      node.open = true;
      setTree([...tree]);
    }
    onTrashCleared();
  }, [trashCleared, trashDir, tree, onTrashCleared]);

  // Клик раскрыть / свернуть
  const toggle = async (node) => {
    if (!node.isFolder) return;
    if (node.children === null) {
      const [, list] = await invoke("read_dir", { dir: node.path });
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

  // Рекурсивный рендер с подсветкой текущей папки
  const renderNode = (node, depth = 0) => {
    const isSelected = node.path === currentPath;

    return (
      <React.Fragment key={node.path}>
        <ListItemButton
          selected={isSelected}
          sx={{
            pl: 2 + depth * 2,
            bgcolor: isSelected ? "action.selected" : "inherit",
            fontWeight: isSelected ? "bold" : "normal",
          }}
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
            {node.isFolder ? (
              node.open ? (
                <FolderOpenIcon />
              ) : (
                <FolderIcon />
              )
            ) : (
              <InsertDriveFileIcon />
            )}
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
  };

  return (
    <List dense disablePadding sx={{ height: "100%" }}>
      {tree.map((n) => renderNode(n))}
    </List>
  );
}
