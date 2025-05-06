// src/components/MemoryBar.jsx
import React, { useState, useEffect } from "react";
import { Box, Typography, LinearProgress } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";

export default function MemoryBar() {
  const [usage, setUsage] = useState({ used: "0", total: "0", percent: 0 });

  useEffect(() => {
    let mounted = true;
    async function fetch() {
      const out = await invoke("df");
      const lines = out.trim().split("\n");
      if (lines.length < 2) return;
      const parts = lines[1].split(/\s+/);
      const total = parts[1], used = parts[2];
      const percent = parseInt(parts[4].replace("%", ""), 10);
      if (mounted) setUsage({ used, total, percent });
    }
    fetch();
    const iv = setInterval(fetch, 10000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, []);

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        Диск: {usage.used} из {usage.total} ({usage.percent}%)
      </Typography>
      <LinearProgress
        variant="determinate"
        value={usage.percent}
        sx={{ height: 8, borderRadius: 1, mt: 0.5 }}
      />
    </Box>
  );
}
