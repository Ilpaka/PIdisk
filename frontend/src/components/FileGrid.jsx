// src/components/FileGrid.jsx
import React, { useRef, useEffect } from "react";
import { Grid, Paper, Typography, TextField, Box, Tooltip} from "@mui/material";
import FolderIcon        from "@mui/icons-material/Folder";
import PictureAsPdfIcon  from "@mui/icons-material/PictureAsPdf";
import ImageIcon         from "@mui/icons-material/Image";
import GridOnIcon        from "@mui/icons-material/GridOn";
import SlideshowIcon     from "@mui/icons-material/Slideshow";
import VideocamIcon      from "@mui/icons-material/Videocam";
import MusicNoteIcon     from "@mui/icons-material/MusicNote";
import DescriptionIcon   from "@mui/icons-material/Description";

const ICON_SIZE = 38;

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
  html: <Box component="img" src="https://img.icons8.com/color/24/000000/html-5--v1.png" alt="html" sx={{ width: ICON_SIZE, height: ICON_SIZE }} />,
  htm:  <Box component="img" src="https://img.icons8.com/color/24/000000/html-5--v1.png" alt="htm" sx={{ width: ICON_SIZE, height: ICON_SIZE }} />,
  css:  <Box component="img" src="https://img.icons8.com/color/24/000000/css3.png" alt="css" sx={{ width: ICON_SIZE, height: ICON_SIZE }} />,
  js:   <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/javascript.svg" alt="js" sx={{ width: ICON_SIZE, height: ICON_SIZE }} />,
  ts:   <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/typescript.svg" alt="ts" sx={{ width: ICON_SIZE, height: ICON_SIZE }} />,
  py:   <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/python.svg" alt="py" sx={{ width: ICON_SIZE, height: ICON_SIZE }} />,
  java: <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/java.svg" alt="java" sx={{ width: ICON_SIZE, height: ICON_SIZE }} />,
  go:   <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/go.svg" alt="go" sx={{ width: ICON_SIZE, height: ICON_SIZE }} />,
  rs:   <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/rust.svg" alt="rust" sx={{ width: ICON_SIZE, height: ICON_SIZE }} />,
  cpp:  <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/cplusplus.svg" alt="cpp" sx={{ width: ICON_SIZE, height: ICON_SIZE }} />,
  c:    <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/c.svg" alt="c" sx={{ width: ICON_SIZE, height: ICON_SIZE }} />,
  cs:   <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/csharp.svg" alt="c#" sx={{ width: ICON_SIZE, height: ICON_SIZE }} />,
  php:  <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/php.svg" alt="php" sx={{ width: ICON_SIZE, height: ICON_SIZE }} />,
  rb:   <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/ruby.svg" alt="rb" sx={{ width: ICON_SIZE, height: ICON_SIZE }} />,
  swift:<Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/swift.svg" alt="swift" sx={{ width: ICON_SIZE, height: ICON_SIZE }} />,
  kt:   <Box component="img" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/kotlin.svg" alt="kt" sx={{ width: ICON_SIZE, height: ICON_SIZE }} />,
  default: <DescriptionIcon color="disabled" sx={{ fontSize: ICON_SIZE }} />,
};

function getFileIcon(name) {
  // папка
  if (!/\.[^/.]+$/.test(name)) {
    return <FolderIcon sx={{ fontSize: 42 }} color="primary" />;
  }
  const ext = name.split(".").pop().toLowerCase();
  return extToIcon[ext] || extToIcon.default;
}

export default function FileGrid({
  items,
  onDoubleClick,
  onContextMenu,
  renameTarget,
  renameValue,
  onRenameChange,
  onRenameConfirm,
  viewMode = "grid",
  selectedFiles = [],
  setSelectedFiles = () => {},
}) {
  const handleSelect = (e, name) => {
    e.preventDefault();
    // Сброс если клик по уже выбранному файлу без модификаторов и это единственный выбранный
    if (
      selectedFiles.includes(name) &&
      !e.ctrlKey && !e.metaKey && !e.shiftKey &&
      selectedFiles.length === 1
    ) {
      setSelectedFiles([]);
      return;
    }
    if (e.shiftKey && selectedFiles.length) {
      const sorted = [...items];
      const last = sorted.indexOf(selectedFiles[selectedFiles.length - 1]);
      const curr = sorted.indexOf(name);
      const [from, to] = last < curr ? [last, curr] : [curr, last];
      const range = sorted.slice(from, to + 1);
      setSelectedFiles(Array.from(new Set([...selectedFiles, ...range])));
    } else if (e.ctrlKey || e.metaKey) {
      if (selectedFiles.includes(name)) {
        setSelectedFiles(selectedFiles.filter(f => f !== name));
      } else {
        setSelectedFiles([...selectedFiles, name]);
      }
    } else {
      setSelectedFiles([name]);
    }
  };
  // Сортируем: папки - сначала, потом файлы
  const sortedItems = [...items];

  if (viewMode === "grid") {
    return (
      <Box
        sx={{
          width: "100%",
          minHeight: "100vh", // или высоту родителя, чтобы покрыть всю область
          position: "relative",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
        setSelectedFiles([]);
        }
      }}
    > 
      <Grid container spacing={2}>
        {sortedItems.map((name) => {
          const isFolder = !/\.[^/.]+$/.test(name);
          const isSelected = selectedFiles.includes(name);

          return (
            <Grid item xs={6} sm={4} md={3} lg={2} key={name}>
              <Paper
                onClick={(e) => {e.stopPropagation(); 
                handleSelect(e, name);}}
                onDoubleClick={() => onDoubleClick(name)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onContextMenu(e, name);
                }}
                sx={{
                  width: 95,
                  height: 95,
                  p: 0.3,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 1,
                  cursor: "pointer",
                  transition: "box-shadow 0.2s, background 0.2s",
                  boxShadow: isSelected ? 3: "none",
                  backgroundColor: isSelected ? "primary.light" : "background.paper",
                  "&:hover": {
                    backgroundColor: isSelected ? "primary.light" : "background.paper",
                    boxShadow: isSelected ? 3 : 4,
                  },
                }}                 
              >     
                <Box sx={{ mb: 1 }}>
                  {getFileIcon(name, 40)} {/* 40px иконка */}
                </Box>
                {renameTarget === name ? (
                  <TextField
                    value={renameValue}
                    onChange={(e) => onRenameChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onRenameConfirm();
                      if (e.key === "Escape") {
                        onRenameChange(name);
                        onRenameConfirm();
                      }
                    }}
                    onBlur={() => setTimeout(onRenameConfirm, 0)}
                    size="small"
                    fullWidth
                    variant="standard"
                  />
                ) : (
                  <Tooltip title={name} arrow>
                    <Typography
                      noWrap={false}
                      sx={{
                        fontSize: '0.6rem',          
                        textAlign: 'center',                
                        display: '-webkit-box',
                        WebkitLineClamp: 2,           
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                        lineHeight: 1.2,
                        maxHeight: '3.6em',          
                      }}
                    >
                      {name}
                    </Typography>
                  </Tooltip>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box> 
    );
  }

  // --- LIST VIEW ---
  return (
    <Box>
      {items.map((name) => (
        <Paper
          onClick={(e) => handleSelect(e, name)}
          onDoubleClick={() => onDoubleClick(name)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onContextMenu(e, name);
          }}
          sx={{
            p: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 120,
            borderRadius: 2,
            cursor: "pointer",
            transition: "box-shadow 0.2s, background 0.2s",
            boxShadow: selectedFiles.includes(name) ? 6 : 1,
            backgroundColor: selectedFiles.includes(name) ? "primary.light" : "background.paper",
            "&:hover": {
              backgroundColor: selectedFiles.includes(name) ? "primary.light" : "action.hover",
              boxShadow: selectedFiles.includes(name) ? 6 : 4,
            },
          }}
        >
          {renameTarget === name ? (
            <TextField
              inputRef={inputRef}
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRenameConfirm();
                if (e.key === "Escape") {
                  onRenameChange(name);
                  onRenameConfirm();
                }
              }}
              onBlur={() => setTimeout(onRenameConfirm, 0)}
              size="small"
              fullWidth
              variant="standard"
            />
          ) : (
            <>
              {getFileIcon(name)}
              <Typography noWrap>{name}</Typography>
            </>
          )}
        </Paper>
      ))}
    </Box>
  );
}
