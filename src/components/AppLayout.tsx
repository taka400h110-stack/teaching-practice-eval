import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Toolbar, Typography, Divider, Avatar, Chip,
} from "@mui/material";
import MenuIcon           from "@mui/icons-material/Menu";
import DashboardIcon      from "@mui/icons-material/Dashboard";
import MenuBookIcon       from "@mui/icons-material/MenuBook";
import BarChartIcon       from "@mui/icons-material/BarChart";
import SelfImprovementIcon from "@mui/icons-material/SelfImprovement";
import TimelineIcon       from "@mui/icons-material/Timeline";
import TrackChangesIcon   from "@mui/icons-material/TrackChanges";
import ChatIcon           from "@mui/icons-material/Chat";
import LogoutIcon         from "@mui/icons-material/Logout";
import mockApi from "../api/client";

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: "ダッシュボード",    path: "/dashboard",       icon: <DashboardIcon /> },
  { label: "実習日誌",          path: "/journals",        icon: <MenuBookIcon /> },
  { label: "成長グラフ",        path: "/growth",          icon: <TimelineIcon /> },
  { label: "自己評価",          path: "/self-evaluation", icon: <SelfImprovementIcon /> },
  { label: "LPSダッシュボード", path: "/lps",             icon: <BarChartIcon /> },
  { label: "目標履歴",          path: "/goals",           icon: <TrackChangesIcon /> },
  { label: "チャットBot",       path: "/chat",            icon: <ChatIcon /> },
];

export default function AppLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = mockApi.getCurrentUser();

  const handleLogout = async () => {
    await mockApi.logout();
    navigate("/login");
  };

  const drawer = (
    <Box>
      <Toolbar sx={{ bgcolor: "primary.main" }}>
        <Typography variant="h6" color="white" fontWeight="bold" fontSize={14} lineHeight={1.3}>
          教育実習<br />評価システム
        </Typography>
      </Toolbar>
      <Divider />
      {user && (
        <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 13 }}>
            {user.name?.[0] ?? "U"}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight="bold" noWrap>{user.name}</Typography>
            <Chip label={user.role} size="small" sx={{ fontSize: 10, height: 16 }} />
          </Box>
        </Box>
      )}
      <Divider />
      <List dense>
        {NAV_ITEMS.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname.startsWith(item.path)}
            onClick={() => { navigate(item.path); setMobileOpen(false); }}
            sx={{ "&.Mui-selected": { bgcolor: "primary.light", color: "primary.contrastText" } }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 13 }} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <List dense>
        <ListItemButton onClick={handleLogout}>
          <ListItemIcon sx={{ minWidth: 36 }}><LogoutIcon /></ListItemIcon>
          <ListItemText primary="ログアウト" primaryTypographyProps={{ fontSize: 13 }} />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{ width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { sm: `${DRAWER_WIDTH}px` } }}
      >
        <Toolbar variant="dense">
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 2, display: { sm: "none" } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="subtitle1" fontWeight="bold" noWrap>
            {NAV_ITEMS.find((n) => location.pathname.startsWith(n.path))?.label ?? "教育実習評価システム"}
          </Typography>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: "block", sm: "none" }, "& .MuiDrawer-paper": { width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: "none", sm: "block" }, "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" } }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, mt: "48px" }}>
        <Outlet />
      </Box>
    </Box>
  );
}
