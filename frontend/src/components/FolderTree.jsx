import React, { useState, useEffect } from "react";
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import DescriptionIcon from "@mui/icons-material/Description";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ImageIcon from "@mui/icons-material/Image";
import GridOnIcon from "@mui/icons-material/GridOn";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import VideocamIcon from "@mui/icons-material/Videocam";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { invoke } from "@tauri-apps/api/core";

const ICON_SIZE = 24;
const ICON_SIZE2 = 20;

const extToIcon = {
  pdf:  <PictureAsPdfIcon color="error" sx={{ fontSize: ICON_SIZE }} />,
  txt:  <DescriptionIcon color="action" sx={{ fontSize: ICON_SIZE }} />,
  doc:  <DescriptionIcon color="action" sx={{ fontSize: ICON_SIZE }} />,
  docx: <DescriptionIcon color="action" sx={{ fontSize: ICON_SIZE }} />,
  jpg:  <ImageIcon color="primary" sx={{ fontSize: ICON_SIZE }} />,
  jpeg: <ImageIcon color="primary" sx={{ fontSize: ICON_SIZE }} />,
  png:  <ImageIcon color="primary" sx={{ fontSize: ICON_SIZE }} />,
  gif:  <ImageIcon color="primary" sx={{ fontSize: ICON_SIZE }} />,
  xls:  <GridOnIcon color="success" sx={{ fontSize: ICON_SIZE }} />,
  xlsx: <GridOnIcon color="success" sx={{ fontSize: ICON_SIZE }} />,
  ppt:  <SlideshowIcon color="secondary" sx={{ fontSize: ICON_SIZE }} />,
  pptx: <SlideshowIcon color="secondary" sx={{ fontSize: ICON_SIZE }} />,
  mp4:  <VideocamIcon color="secondary" sx={{ fontSize: ICON_SIZE }} />,
  avi:  <VideocamIcon color="secondary" sx={{ fontSize: ICON_SIZE }} />,
  mkv:  <VideocamIcon color="secondary" sx={{ fontSize: ICON_SIZE }} />,
  mov:  <VideocamIcon color="secondary" sx={{ fontSize: ICON_SIZE }} />,
  mp3:  <MusicNoteIcon color="secondary" sx={{ fontSize: ICON_SIZE }} />,
  wav:  <MusicNoteIcon color="secondary" sx={{ fontSize: ICON_SIZE }} />,
  html: <Box component="img" src="https://img.icons8.com/color/24/000000/html-5--v1.png" alt="html" sx={{ width: ICON_SIZE2, height: ICON_SIZE2 }} />,
  htm:  <Box component="img" src="https://img.icons8.com/color/24/000000/html-5--v1.png" alt="htm" sx={{ width: ICON_SIZE2, height: ICON_SIZE2 }} />,
  css:  <Box component="img" src="https://img.icons8.com/color/24/000000/css3.png" alt="css" sx={{ width: ICON_SIZE2, height: ICON_SIZE2 }} />,
  js:   <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/javascript.svg" alt="js" sx={{ width: ICON_SIZE2, height: ICON_SIZE2 }} />,
  ts:   <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/typescript.svg" alt="ts" sx={{ width: ICON_SIZE2, height: ICON_SIZE2 }} />,
  py:   <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/python.svg" alt="py" sx={{ width: ICON_SIZE2, height: ICON_SIZE2 }} />,
  java: <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/java.svg" alt="java" sx={{ width: ICON_SIZE2, height: ICON_SIZE2 }} />,
  go:   <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/go.svg" alt="go" sx={{ width: ICON_SIZE2, height: ICON_SIZE2 }} />,
  rs:   <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/rust.svg" alt="rust" sx={{ width: ICON_SIZE2, height: ICON_SIZE2 }} />,
  cpp:  <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/cplusplus.svg" alt="cpp" sx={{ width: ICON_SIZE2, height: ICON_SIZE2 }} />,
  c:    <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/c.svg" alt="c" sx={{ width: ICON_SIZE2, height: ICON_SIZE2 }} />,
  cs:   <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/csharp.svg" alt="c#" sx={{ width: ICON_SIZE2, height: ICON_SIZE2 }} />,
  php:  <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/php.svg" alt="php" sx={{ width: ICON_SIZE2, height: ICON_SIZE2 }} />,
  rb:   <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/ruby.svg" alt="rb" sx={{ width: ICON_SIZE2, height: ICON_SIZE2 }} />,
  swift:<Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/swift.svg" alt="swift" sx={{ width: ICON_SIZE2, height: ICON_SIZE2 }} />,
  kt:   <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/kotlin.svg" alt="kt" sx={{ width: ICON_SIZE2, height: ICON_SIZE2 }} />,
  default: <DescriptionIcon color="disabled" sx={{ fontSize: ICON_SIZE }} />,
};

function getFileIcon(name) {
  if (!/\.[^/.]+$/.test(name)) {
    return <FolderIcon sx={{ fontSize: ICON_SIZE }} color="primary" />;
  }
  const ext = name.split(".").pop().toLowerCase();
  return extToIcon[ext] || extToIcon.default;
}

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

  useEffect(() => {
    async function expandAll() {
      let newTree = updateOpenState(tree, currentPath);

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
  }, [currentPath]);

  useEffect(() => {
    if (!createdFolder) return;
    const { parentPath, oldName, newName } = createdFolder;
    const parent = findNode(tree, parentPath);
    if (parent && parent.children) {
      if (oldName) {
        const child = parent.children.find((c) => c.name === oldName);
        if (child) {
          child.name = newName;
          child.path = `${parentPath}/${newName}`;
        }
      } else {
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

  useEffect(() => {
  if (!deletedItem) return;

  const { parentPath, names } = deletedItem;
  if (!names) return;

  const parent = findNode(tree, parentPath);
  if (parent && parent.children) {
    parent.children = parent.children.filter(c => !names.includes(c.name));
    setTree([...tree]);
  }
  onItemDeleted();
}, [deletedItem, onItemDeleted, tree]);


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
            minHeight: 32,
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
          <ListItemIcon sx={{ minWidth: 32 }}>
            {node.isFolder ? (
              node.open ? (
                <FolderOpenIcon sx={{ fontSize: ICON_SIZE, color: '#1c74d4' }} />
              ) : (
                <FolderIcon sx={{ fontSize: ICON_SIZE,  color:"#1c74d4" }} />
              )
            ) : (
              getFileIcon(node.name)
            )}
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography sx={{ fontSize: "0.75rem", lineHeight: 1 }}>
                {node.name}
              </Typography>
            }
          />
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
