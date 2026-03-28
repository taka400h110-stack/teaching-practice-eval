import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  AppBar, Box, CssBaseline, Drawer, Container, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Toolbar, Typography, Divider, Avatar, Chip,
  Collapse, Tooltip,
} from "@mui/material";
import MenuIcon               from "@mui/icons-material/Menu";
import DashboardIcon          from "@mui/icons-material/Dashboard";
import MenuBookIcon           from "@mui/icons-material/MenuBook";
import SelfImprovementIcon    from "@mui/icons-material/SelfImprovement";
import TimelineIcon           from "@mui/icons-material/Timeline";
import TrackChangesIcon       from "@mui/icons-material/TrackChanges";
import ChatIcon               from "@mui/icons-material/Chat";
import LogoutIcon             from "@mui/icons-material/Logout";
import AssessmentIcon         from "@mui/icons-material/Assessment";
import GroupsIcon             from "@mui/icons-material/Groups";
import CompareArrowsIcon      from "@mui/icons-material/CompareArrows";
import PsychologyIcon         from "@mui/icons-material/Psychology";
import EqualizerIcon          from "@mui/icons-material/Equalizer";
import SchoolIcon             from "@mui/icons-material/School";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ExpandLessIcon         from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon         from "@mui/icons-material/ExpandMore";
import VerifiedUserIcon       from "@mui/icons-material/VerifiedUser";
import PersonAddIcon          from "@mui/icons-material/PersonAdd";
import DownloadIcon           from "@mui/icons-material/Download";
import AccountBalanceIcon     from "@mui/icons-material/AccountBalance";
import ScienceIcon from "@mui/icons-material/Science";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import DescriptionIcon from "@mui/icons-material/Description";
import StorageIcon from "@mui/icons-material/Storage";

import InsightsIcon from "@mui/icons-material/Insights";
import apiClient from "../api/client";
import type { UserRole } from "../types";

const DRAWER_WIDTH = 260;

type NavItem  = { label: string; path: string; icon: React.ReactNode };
type NavGroup = { group: string; items: NavItem[] };

// ────────────────────────────────────────────
const ROLE_LABEL: Record<UserRole, string> = {
  student:        "実習生",
  teacher: "実習校教員 (Legacy)",
    univ_teacher:   "大学教員",
  school_mentor:  "校内指導教員",
  evaluator:      "評価者（RQ2）",
  researcher:     "研究者",
  collaborator:   "研究協力者",
  board_observer: "教育委員会",
  admin:          "管理者",
};

const ROLE_COLOR: Record<UserRole, string> = {
  student:        "#1976d2",
  teacher: "実習校教員 (Legacy)",
    univ_teacher:   "#388e3c",
  school_mentor:  "#f57c00",
  evaluator:      "#e64a19",
  researcher:     "#0288d1",
  collaborator:   "#00897b",
  board_observer: "#5e35b1",
  admin:          "#7b1fa2",
};

// ────────────────────────────────────────────
// 役割別ナビゲーション（論文2 RQ2 ＆ 論文3 RQ3）
// ────────────────────────────────────────────
function getNavGroupsForSingleRole(role: UserRole): NavGroup[] {
  if (role === "student") {
    return [
      {
        group: "週次サイクル（RQ3）",
        items: [
          { label: "ダッシュボード", path: "/dashboard", icon: <DashboardIcon /> },
          { label: "実習日誌ワークフロー", path: "/journal-workflow", icon: <MenuBookIcon /> },
          { label: "手書き日誌OCR", path: "/ocr", icon: <AssessmentIcon /> },
          { label: "過去の日誌一覧", path: "/journals", icon: <AssessmentIcon /> },
          { label: "チャット履歴", path: "/chat", icon: <ChatIcon /> },
        ],
      },
      {
        group: "自己評価・成長（RQ3）",
        items: [
          { label: "自己評価入力", path: "/self-evaluation", icon: <SelfImprovementIcon /> },
          { label: "成長グラフ", path: "/growth", icon: <TimelineIcon /> },
          { label: "目標履歴（SMART）", path: "/goals", icon: <TrackChangesIcon /> },
        ],
      },
    ];
  }

  if (role === "univ_teacher" || role === "school_mentor") {
    return [
      {
        group: "ダッシュボード",
        items: [
          { label: "教員ダッシュボード", path: "/teacher-dashboard", icon: <DashboardIcon /> },
        ],
      },
      {
        group: "実習生指導",
        items: [
          { label: "提出された日誌一覧", path: "/journals", icon: <GroupsIcon /> },
        ],
      },
      {
        group: "学生管理",
        items: [
          { label: "学生コホート管理", path: "/cohorts", icon: <SchoolIcon /> },
          { label: "統計サマリー", path: "/statistics", icon: <AnalyticsIcon /> },
        ],
      },
    ];
  }

  if (role === "evaluator") {
    return [
      {
        group: "評価業務（RQ2）",
        items: [
          { label: "評価一覧", path: "/evaluations", icon: <AssignmentTurnedInIcon /> },
          { label: "AI vs 人間比較", path: "/comparison", icon: <CompareArrowsIcon /> },
          { label: "信頼性分析（ICC）", path: "/reliability", icon: <ScienceIcon /> },
        ],
      },
    ];
  }

  if (role === "researcher" || role === "collaborator" || role === "board_observer") {
    return [
      {
        group: "研究ダッシュボード",
        items: [
          { label: "管理者画面", path: "/admin", icon: <DashboardIcon /> },
        ],
      },
      {
        group: "AI評価信頼性",
        items: [
          { label: "評価一覧", path: "/evaluations", icon: <AssignmentTurnedInIcon /> },
          { label: "AI vs 人間比較", path: "/comparison", icon: <CompareArrowsIcon /> },
          { label: "信頼性分析（ICC）", path: "/reliability", icon: <ScienceIcon /> },
        ],
      },
      {
        group: "縦断成長分析",
        items: [
          { label: "コホート管理", path: "/cohorts", icon: <SchoolIcon /> },
          { label: "縦断分析（LGCM）", path: "/longitudinal", icon: <AutoGraphIcon /> },
          { label: "SCAT質的分析", path: "/scat", icon: <DescriptionIcon /> },
          { label: "SCATバッチ分析", path: "/scat-batch", icon: <DescriptionIcon /> },
          { label: "SCATネットワーク分析", path: "/scat-network", icon: <DescriptionIcon /> },
          { label: "SCAT時系列分析", path: "/scat-timeline", icon: <DescriptionIcon /> },
          { label: "統計サマリー", path: "/statistics", icon: <AnalyticsIcon /> },
          { label: "高度分析 (Beta)", path: "/advanced-analytics", icon: <InsightsIcon /> },
        ],
      },
      {
        group: "データ管理・出力",
        items: [
          { label: "データエクスポート", path: "/exports", icon: <DownloadIcon /> },
        ],
      }

    ];
  }

  if (role === "admin") {
    return [
      {
        group: "システム管理",
        items: [
          { label: "管理ダッシュボード", path: "/admin", icon: <AdminPanelSettingsIcon /> },
          { label: "プラットフォーム分析", path: "/platform-analytics", icon: <StorageIcon /> },
          { label: "ユーザー登録", path: "/register", icon: <PersonAddIcon /> },

          { label: "エクスポート承認管理", path: "/admin/exports", icon: <VerifiedUserIcon /> },
          { label: "データエクスポート", path: "/exports", icon: <DownloadIcon /> },

        ],
      },
    ];
  }

  return [];
}

function getNavGroups(roles: UserRole[]): NavGroup[] {
  const merged = new Map<string, NavItem[]>();
  roles.forEach(role => {
    const groups = getNavGroupsForSingleRole(role);
    groups.forEach(g => {
      if (!merged.has(g.group)) merged.set(g.group, []);
      const items = merged.get(g.group)!;
      g.items.forEach(item => {
        if (!items.find(i => i.path === item.path)) items.push(item);
      });
    });
  });
  return Array.from(merged.entries()).map(([group, items]) => ({ group, items }));
}

// ────────────────────────────────────────────
// コンポーネント本体
// ────────────────────────────────────────────
export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed]   = useState<Record<string, boolean>>({});

  const user = apiClient.getCurrentUser() as { id: string; name: string; role: UserRole } | null;
  const roles: UserRole[] = ((user as any)?.roles || [(user as any)?.role || "student"]) ?? ["student"];
  // 下位互換性のため古い role も fallback として扱う
  if (user && !(user as any).roles && (user as any).role) roles.push((user as any).role);
  const navGroups = getNavGroups(roles);
  const allItems  = navGroups.flatMap((g) => g.items);

  const handleLogout = async () => {
    await apiClient.logout();
    navigate("/login");
  };

  const toggleGroup = (group: string) =>
    setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }));

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "white" }}>
      {/* ロゴ */}
      <Box sx={{ bgcolor: ROLE_COLOR[roles[0] as UserRole] ?? "primary.main", px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
        <SchoolIcon sx={{ color: "white", fontSize: 22 }} />
        <Box>
          <Typography variant="caption" color="rgba(255,255,255,0.8)" fontSize={9} display="block" lineHeight={1}>
            AI支援
          </Typography>
          <Typography variant="subtitle2" color="white" fontWeight="bold" fontSize={11} lineHeight={1.2}>
            教育実習評価システム
          </Typography>
        </Box>
      </Box>
      <Divider />

      {/* ユーザー情報 */}
      {user && (
        <Box sx={{ p: 1.5, display: "flex", alignItems: "flex-start", gap: 1.5, bgcolor: "grey.50" }}>
          <Avatar
            sx={{
              width: 40, height: 40,
              bgcolor: ROLE_COLOR[roles[0] as UserRole] ?? "primary.main",
              fontSize: 16, fontWeight: "bold",
              flexShrink: 0,
            }}
          >
            {user.name?.[0] ?? "U"}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" fontWeight="bold" noWrap fontSize={13}>{user.name}</Typography>
            {roles.map(r => (
              <Chip
                key={r}
                label={ROLE_LABEL[r as UserRole] ?? r}
                size="small"
                sx={{
                  fontSize: 9, height: 16,
                  bgcolor: ROLE_COLOR[r as UserRole] ?? "primary.main",
                  color: "white", mt: 0.3, mb: 0.3, mr: 0.5,
                }}
              />
            ))}
            {/* 実習生：学籍番号・学年・実習情報 */}
            {roles.includes("student") && (
              <Box>
                {(user as { student_number?: string }).student_number && (
                  <Typography variant="caption" display="block" color="text.secondary" fontSize={10} noWrap>
                    学籍: {(user as { student_number?: string }).student_number}
                  </Typography>
                )}
                {(user as { grade?: number }).grade && (
                  <Typography variant="caption" display="block" color="text.secondary" fontSize={10} noWrap>
                    {(user as { grade?: number }).grade}年生
                    {(user as { school_type?: string }).school_type &&
                      ` / ${
                        ({ elementary: "小学校", middle: "中学校", high: "高等学校", special: "特別支援" } as Record<string, string>)[
                          (user as { school_type?: string }).school_type ?? ""
                        ] ?? ""
                      }`
                    }
                  </Typography>
                )}
                {(user as { internship_type?: string }).internship_type && (
                  <Typography variant="caption" display="block" color="text.secondary" fontSize={10} noWrap>
                    {(user as { internship_type?: string }).internship_type === "intensive" ? "集中実習" : "分散実習"}
                    {(user as { weeks?: number }).weeks ? ` ${(user as { weeks?: number }).weeks}週間` : ""}
                  </Typography>
                )}
              </Box>
            )}
            {/* 実習生以外：所属・役職 */}
            {!roles.includes("student") && (
              <Box>
                {(user as { organization?: string }).organization && (
                  <Typography variant="caption" display="block" color="text.secondary" fontSize={10} sx={{ lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {(user as { organization?: string }).organization}
                  </Typography>
                )}
                {(user as { position?: string }).position && (
                  <Typography variant="caption" display="block" color="text.secondary" fontSize={10} noWrap>
                    {(user as { position?: string }).position}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>
      )}
      <Divider />

      {/* ナビゲーション */}
      <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
        {navGroups.map(({ group, items }) => (
          <React.Fragment key={group}>
            <ListItemButton
              dense
              onClick={() => toggleGroup(group)}
              sx={{ py: 0.5, px: 1.5, bgcolor: "#f8f8f8" }}
            >
              <ListItemText
                primary={group}
                primaryTypographyProps={{
                  fontSize: 9, fontWeight: 700,
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              />
              {collapsed[group] ? <ExpandMoreIcon sx={{ fontSize: 14, color: "text.disabled" }} /> : <ExpandLessIcon sx={{ fontSize: 14, color: "text.disabled" }} />}
            </ListItemButton>
            <Collapse in={!collapsed[group]}>
              <List dense disablePadding>
                {items.map((item) => {
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== "/dashboard" && location.pathname.startsWith(item.path + "/"));
                  return (
                    <Tooltip key={`${item.path}-${item.label}`} title={item.label} placement="right" disableHoverListener>
                      <ListItemButton
                        selected={isActive}
                        onClick={() => { navigate(item.path); setMobileOpen(false); }}
                        sx={{
                          pl: 2, py: 0.6,
                          "&.Mui-selected": {
                            bgcolor: `${ROLE_COLOR[roles[0] as UserRole] ?? "#1976d2"}18`,
                            borderRight: `3px solid ${ROLE_COLOR[roles[0] as UserRole] ?? "#1976d2"}`,
                            "& .MuiListItemIcon-root": { color: ROLE_COLOR[roles[0] as UserRole] ?? "#1976d2" },
                            "& .MuiListItemText-primary": { color: ROLE_COLOR[roles[0] as UserRole] ?? "#1976d2", fontWeight: 700 },
                          },
                          "&.Mui-selected:hover": {
                            bgcolor: `${ROLE_COLOR[roles[0] as UserRole] ?? "#1976d2"}28`,
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 30, "& .MuiSvgIcon-root": { fontSize: 18 } }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{ fontSize: 12 }}
                        />
                      </ListItemButton>
                    </Tooltip>
                  );
                })}
              </List>
            </Collapse>
          </React.Fragment>
        ))}
      </Box>

      <Divider />
      {/* ログアウト */}
      <List dense>
        <ListItemButton onClick={handleLogout} sx={{ color: "text.secondary" }}>
          <ListItemIcon sx={{ minWidth: 30 }}><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="ログアウト" primaryTypographyProps={{ fontSize: 12 }} />
        </ListItemButton>
      </List>
    </Box>
  );

  const currentLabel =
    allItems.find(
      (n) => location.pathname === n.path || location.pathname.startsWith(n.path + "/")
    )?.label ?? "AI支援 教育実習評価システム";

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml:    { sm: `${DRAWER_WIDTH}px` },
          bgcolor: ROLE_COLOR[roles[0] as UserRole] ?? "primary.main",
          boxShadow: 1,
        }}
      >
        <Toolbar variant="dense">
          <IconButton
            color="inherit" edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="subtitle1" fontWeight="bold" noWrap sx={{ flexGrow: 1 }}>
            {currentLabel}
          </Typography>
          {roles.map(r => (
            <Chip
              key={r}
              label={ROLE_LABEL[r] ?? r}
              size="small"
              sx={{ bgcolor: "rgba(255,255,255,0.25)", color: "white", fontSize: 10, height: 20, ml: 0.5 }}
            />
          ))}
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1, p: { xs: 1.5, sm: 2.5 },
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: "48px",
          bgcolor: "#f5f7fa",
          minHeight: "calc(100vh - 48px)",
        }}
      >
        <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}
