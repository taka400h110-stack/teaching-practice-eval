import React, { useState, useEffect, useCallback } from "react";
import {
  IconButton, Badge, Menu, MenuItem, ListItemText, ListItemIcon,
  Typography, Divider, Box, Button, CircularProgress, Tooltip
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CircleIcon from "@mui/icons-material/Circle";
import DescriptionIcon from "@mui/icons-material/Description";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";

interface Notification {
  id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  type: string;
  title: string;
  body: string | null;
  resource_type: string | null;
  resource_id: string | null;
  is_read: number;
  read_at: string | null;
  created_at: string;
}

const POLL_INTERVAL_MS = 60_000; // 60秒ごとに未読件数をポーリング

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
  "Content-Type": "application/json",
});

const NotificationBell: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [unread, setUnread] = useState<number>(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const open = Boolean(anchorEl);

  // 未読件数のみ取得 (軽量・定期実行)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await apiFetch("/api/data/notifications/unread-count", { headers: authHeaders() });
      if (!res.ok) return;
      const data = (await res.json()) as { unread_count?: number };
      setUnread(Number(data?.unread_count || 0));
    } catch {
      /* silent */
    }
  }, []);

  // 一覧取得 (メニューを開いた時のみ)
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/data/notifications?limit=20", { headers: authHeaders() });
      if (res.ok) {
        const data = (await res.json()) as { notifications?: Notification[]; unread_count?: number };
        setItems(data?.notifications || []);
        setUnread(Number(data?.unread_count || 0));
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const t = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [fetchUnreadCount]);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
    fetchList();
  };
  const handleClose = () => setAnchorEl(null);

  const markRead = async (id: string) => {
    try {
      await apiFetch(`/api/data/notifications/${id}/read`, { method: "POST", headers: authHeaders() });
      setItems(prev => prev.map(n => (n.id === id ? { ...n, is_read: 1 } : n)));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {
      /* silent */
    }
  };

  const markAllRead = async () => {
    try {
      await apiFetch("/api/data/notifications/mark-all-read", { method: "POST", headers: authHeaders() });
      setItems(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnread(0);
    } catch {
      /* silent */
    }
  };

  const handleItemClick = async (n: Notification) => {
    if (!n.is_read) markRead(n.id);
    handleClose();
    if (n.resource_type === "journal" && n.resource_id) {
      navigate(`/journals/${n.resource_id}`);
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso.replace(" ", "T") + "Z");
      const diff = Date.now() - d.getTime();
      const m = Math.floor(diff / 60000);
      if (m < 1) return "たった今";
      if (m < 60) return `${m}分前`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}時間前`;
      const day = Math.floor(h / 24);
      if (day < 7) return `${day}日前`;
      return d.toLocaleDateString("ja-JP");
    } catch {
      return iso;
    }
  };

  return (
    <>
      <Tooltip title={unread > 0 ? `${unread} 件の未読通知` : "通知"}>
        <IconButton color="inherit" onClick={handleOpen} aria-label="通知" size="medium">
          <Badge badgeContent={unread} color="error" max={99} overlap="circular">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{ sx: { width: 380, maxHeight: 520 } }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <Box sx={{ p: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle1" fontWeight="bold">通知</Typography>
          {unread > 0 && (
            <Button size="small" onClick={markAllRead}>すべて既読</Button>
          )}
        </Box>
        <Divider />

        {loading && (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {!loading && items.length === 0 && (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">通知はありません</Typography>
          </Box>
        )}

        {!loading && items.map(n => (
          <MenuItem
            key={n.id}
            onClick={() => handleItemClick(n)}
            sx={{
              whiteSpace: "normal",
              alignItems: "flex-start",
              py: 1.2,
              bgcolor: n.is_read ? "transparent" : "action.hover",
            }}
          >
            <ListItemIcon sx={{ minWidth: 32, mt: 0.4 }}>
              {n.is_read ? (
                <DescriptionIcon fontSize="small" color="action" />
              ) : (
                <CircleIcon sx={{ fontSize: 10, color: "primary.main" }} />
              )}
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2" fontWeight={n.is_read ? 400 : 600} sx={{ lineHeight: 1.3 }}>
                  {n.title}
                </Typography>
              }
              secondary={
                <Box sx={{ mt: 0.3 }}>
                  {n.body && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {n.body}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.disabled">
                    {formatTime(n.created_at)}
                  </Typography>
                </Box>
              }
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default NotificationBell;
