// src/components/FileGrid.jsx
import React, { useRef, useEffect } from "react";
import { Grid, Paper, Typography, TextField, Box } from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

export default function FileGrid({
  items,
  onDoubleClick,
  onContextMenu,
  renameTarget,
  renameValue,
  onRenameChange,
  onRenameConfirm,
}) {
  const inputRef = useRef(null);

  // при старте редактирования — автофокус и выделение всего текста
  useEffect(() => {
    if (renameTarget && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renameTarget]);

  return (
    <Grid container spacing={2}>
      {items.map((name) => {
        const isFolder = !/\.[^/.]+$/.test(name);
        return (
          <Grid item xs={3} key={name}>
            <Paper
              onDoubleClick={() => onDoubleClick(name)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenu(e, name);
              }}
              sx={{
                p: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                minHeight: 48,
              }}
            >
              {renameTarget === name ? (
                <TextField
                  inputRef={inputRef}
                  value={renameValue}
                  onChange={(e) => onRenameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onRenameConfirm();
                    } else if (e.key === "Escape") {
                      onRenameChange(name);
                      onRenameConfirm();
                    }
                  }}
                  onBlur={() => {
                    // откладываем confirm в следующий тик,
                    // чтобы React успел записать последние onChange
                    setTimeout(onRenameConfirm, 0);
                  }}
                  size="small"
                  fullWidth
                  variant="standard"
                />
              ) : (
                <Box display="flex" alignItems="center" gap={1}>
                  {isFolder ? <FolderIcon /> : <InsertDriveFileIcon />}
                  <Typography noWrap>{name}</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        );
      })}
    </Grid>
  );
}
