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


// ... getFileIcon и другие функции ...
// Цветные PNG-иконки через Icons8 CDN
const extToIcon = {
  // документы
  pdf:  <PictureAsPdfIcon color="error" />,
  txt:  <DescriptionIcon color="action" />,
  doc:  <DescriptionIcon color="action" />,
  docx: <DescriptionIcon color="action" />,
  // изображения
  jpg:  <ImageIcon color="primary" />,
  jpeg: <ImageIcon color="primary" />,
  png:  <ImageIcon color="primary" />,
  gif:  <ImageIcon color="primary" />,
  // таблицы
  xls:  <GridOnIcon color="success" />,
  xlsx: <GridOnIcon color="success" />,
  // презентации
  ppt:  <SlideshowIcon color="secondary" />,
  pptx: <SlideshowIcon color="secondary" />,
  // видео
  mp4:  <VideocamIcon color="secondary" />,
  avi:  <VideocamIcon color="secondary" />,
  mkv:  <VideocamIcon color="secondary" />,
  mov:  <VideocamIcon color="secondary" />,
  // аудио
  mp3:  <MusicNoteIcon color="secondary" />,
  wav:  <MusicNoteIcon color="secondary" />,
  // веб
  html: <Box component="img" src="https://img.icons8.com/color/24/000000/html-5--v1.png" alt="html" />,
  htm:  <Box component="img" src="https://img.icons8.com/color/24/000000/html-5--v1.png" alt="htm" />,
  css:  <Box component="img" src="https://img.icons8.com/color/24/000000/css3.png" alt="css" />,
  // программирование
  js:   <Box component="img" src="https://img.icons8.com/color/24/000000/javascript.png" alt="js" />,
  ts:   <Box component="img" src="https://img.icons8.com/color/24/000000/typescript.png" alt="ts" />,
  py:   <Box component="img" src="https://img.icons8.com/color/24/000000/python.png" alt="py" />,
  java: <Box component="img" src="https://img.icons8.com/color/24/000000/java-coffee-cup-logo.png" alt="java" />,
  go:   <Box component="img" src="https://img.icons8.com/color/24/000000/golang.png" alt="go" />,
  rs:   <Box component="img" src="https://img.icons8.com/color/24/000000/rust-programming-language.png" alt="rust" />,
  cpp:  <Box component="img" src="https://img.icons8.com/color/24/000000/c-plus-plus-logo.png" alt="cpp" />,
  c:    <Box component="img" src="https://img.icons8.com/color/24/000000/c-programming.png" alt="c" />,
  cs:   <Box component="img" src="https://img.icons8.com/color/24/000000/c-sharp-logo.png" alt="c#" />,
  php:  <Box component="img" src="https://img.icons8.com/color/24/000000/php.png" alt="php" />,
  rb:   <Box component="img" src="https://img.icons8.com/color/24/000000/ruby-programming-language.png" alt="rb" />,
  swift:<Box component="img" src="https://img.icons8.com/color/24/000000/swift.png" alt="swift" />,
  kt:   <Box component="img" src="https://img.icons8.com/color/24/000000/kotlin.png" alt="kt" />,
  // fallback
  default: <DescriptionIcon color="disabled" />,
};

function getFileIcon(name) {
  // папка
  if (!/\.[^/.]+$/.test(name)) {
    return <FolderIcon color="primary" />;
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
}) {
  // Сортируем: папки - сначала, потом файлы
  const sortedItems = [...items].sort((a, b) => {
    const aIsFolder = !/\.[^/.]+$/.test(a);
    const bIsFolder = !/\.[^/.]+$/.test(b);
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    return a.localeCompare(b);
  });

  if (viewMode === "grid") {
    return (
      <Grid container spacing={2}>
        {sortedItems.map((name) => {
          const isFolder = !/\.[^/.]+$/.test(name);

          return (
            <Grid item xs={6} sm={4} md={3} lg={2} key={name}>
              <Paper
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
                  boxShadow: 1,
                  "&:hover": {
                    backgroundColor: "action.hover",
                    boxShadow: 4,
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
                      noWrap
                      sx={{
                        maxWidth: 100,
                        textAlign: "center",
                        fontWeight: isFolder ? "bold" : "normal",
                        fontSize: 14,
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
    );
  }

  // --- LIST VIEW ---
  return (
    <Box>
      {items.map((name) => (
        <Paper
          key={name}
          onDoubleClick={() => onDoubleClick(name)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onContextMenu(e, name);
          }}
          sx={{
            p: 1,
            mb: 1,
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            minHeight: 48,
            gap: 2,
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
