import React from "react";
import { Grid, Paper, Typography, TextField, Box } from "@mui/material";
import FolderIcon          from "@mui/icons-material/Folder";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

export default function FileGrid({
  items,
  onDoubleClick,
  onContextMenu,    // <- прокидываем из App.jsx
  renameTarget,
  renameValue,
  onRenameChange,
  onRenameConfirm,
}) {
  return (
    <Grid container spacing={2}>
      {items.map((name) => {
        const isFolder = !/\.[^/.]+$/.test(name);
        return (
          <Grid item xs={3} key={name}>
            <Paper
              className="file-item"
              data-name={name}
              onDoubleClick={() => onDoubleClick(name)}
              onContextMenu={e => {
                e.stopPropagation();      // вот эта строчка и блокирует дальнейшее всплытие
                onContextMenu(e, name);   // теперь App.jsx увидит menu.name = name
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
                  value={renameValue}
                  onChange={e => onRenameChange(e.target.value)}
                  onBlur={onRenameConfirm}
                  onKeyDown={e => {
                    if (e.key === "Enter") onRenameConfirm();
                    else if (e.key === "Escape") {
                      onRenameChange(name);
                      onRenameConfirm();
                    }
                  }}
                  size="small"
                  autoFocus
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
