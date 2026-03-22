import React, { useState } from "react";
import {
  Box, Card, CardContent, Chip, Typography, Grid, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, LinearProgress, Tabs, Tab, Alert,
} from "@mui/material";
import PeopleIcon      from "@mui/icons-material/People";
import MenuBookIcon    from "@mui/icons-material/MenuBook";
import AssessmentIcon  from "@mui/icons-material/Assessment";
import StorageIcon     from "@mui/icons-material/Storage";
import { useQuery }    from "@tanstack/react-query";
import mockApi from "../api/client";

export default function AdminDashboardPage() {
  const [tab, setTab] = useState(0);
  const { data: profiles = [] } = useQuery({ queryKey: ["cohort"], queryFn: () => mockApi.getCohortProfiles() });
  const { data: journals = [] } = useQuery({ queryKey: ["journals"], queryFn: () => mockApi.getJournals() });

  const bySchoolType = ["elementary","middle","high","special"].map((t) => ({
    label: { elementary:"小学校", middle:"中学校", high:"高校", special:"特支" }[t as "elementary"],
    count: profiles.filter((p) => p.school_type === t).length,
    avg:   profiles.filter((p) => p.school_type === t).length
      ? (profiles.filter((p) => p.school_type === t).reduce((s, p) => s + p.final_total, 0) / profiles.filter((p) => p.school_type === t).length).toFixed(2)
      : "—",
  }));

  const stats = [
    { label: "総ユーザー数",   value: profiles.length + 5,  icon: <PeopleIcon />,    color: "primary.main" },
    { label: "日誌総数",       value: journals.length,      icon: <MenuBookIcon />,  color: "success.main" },
    { label: "AI評価実施済み", value: journals.filter((j) => j.status === "evaluated").length, icon: <AssessmentIcon />, color: "warning.main" },
    { label: "DBレコード数",   value: "1,157",              icon: <StorageIcon />,   color: "error.main" },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>管理者ダッシュボード</Typography>

      {/* サマリカード */}
      <Grid container spacing={2} mb={3}>
        {stats.map((s) => (
          <Grid key={s.label} size={{ xs: 6, sm: 3 }}>
            <Card>
              <CardContent sx={{ p: "16px !important" }}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Box sx={{ color: s.color }}>{s.icon}</Box>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold" color={s.color}>{s.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Alert severity="info" sx={{ mb: 3 }}>
        システム稼働中 — 最終同期: {new Date().toLocaleString("ja-JP")}
      </Alert>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="学校種別統計" />
        <Tab label="ユーザー管理" />
        <Tab label="システム情報" />
        <Tab label="データエクスポート" />
      </Tabs>

      {tab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>研究用データエクスポート</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box p={2} border="1px solid" borderColor="divider" borderRadius={1}>
                  <Typography variant="subtitle2" fontWeight="bold">Joint Display (質的×量的)</Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    SCATのコーディング結果と、AI評価・自己評価の量的スコアを結合したデータを出力します。
                  </Typography>
                  <Button variant="contained" href="/api/data/export/joint-display-csv" target="_blank" rel="noopener noreferrer">
                    Joint Display CSV をダウンロード
                  </Button>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box p={2} border="1px solid" borderColor="divider" borderRadius={1}>
                  <Typography variant="subtitle2" fontWeight="bold">Chat & Goals (対話と目標)</Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    CoT-Cチャットログと設定されたSMART目標（RQ3b）の全データを出力します。
                  </Typography>
                  <Button variant="contained" href="/api/data/export/chat-goals-csv" target="_blank" rel="noopener noreferrer">
                    Chat & Goals CSV をダウンロード
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* 学校種別 */}
      {tab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>学校種別 学生分布</Typography>
            {bySchoolType.map((s) => (
              <Box key={s.label} mb={2}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2">{s.label}</Typography>
                  <Box display="flex" gap={1}>
                    <Chip label={`${s.count}名`} size="small" variant="outlined" />
                    <Chip label={`平均 ${s.avg}`} size="small" color="primary" variant="outlined" />
                  </Box>
                </Box>
                <LinearProgress variant="determinate" value={(s.count / profiles.length) * 100} sx={{ height: 8, borderRadius: 4 }} />
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ユーザー管理 */}
      {tab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>ロール別ユーザー</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell>ロール</TableCell><TableCell align="center">人数</TableCell><TableCell>権限</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { role: "student",        count: profiles.length, perm: "日誌・自己評価・チャット" },
                    { role: "univ_teacher",   count: 3,              perm: "学生管理・評価・統計閲覧" },
                    { role: "school_mentor",  count: 8,              perm: "担当学生閲覧・コメント" },
                    { role: "researcher",     count: 2,              perm: "全統計・分析データ閲覧" },
                    { role: "admin",          count: 1,              perm: "全機能・ユーザー管理" },
                  ].map((r) => (
                    <TableRow key={r.role} hover>
                      <TableCell><Chip label={r.role} size="small" color="primary" variant="outlined" /></TableCell>
                      <TableCell align="center">{r.count}</TableCell>
                      <TableCell><Typography variant="caption">{r.perm}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* システム情報 */}
      {tab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>システム構成</Typography>
            {[
              { label: "フロントエンド", value: "React 19 + TypeScript + MUI v7" },
              { label: "バックエンド",   value: "Hono / Cloudflare Pages" },
              { label: "データ",         value: "モックデータ（50名分）" },
              { label: "AI評価モデル",   value: "GPT-4o（Chain-of-Thought A）" },
              { label: "評価ルーブリック", value: "4因子23項目 5段階評価 (α=0.95)" },
              { label: "バージョン",     value: "v2.0.0" },
            ].map((item) => (
              <Box key={item.label} sx={{ display: "flex", borderBottom: "1px solid", borderColor: "divider", py: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ width: 160, flexShrink: 0 }}>{item.label}</Typography>
                <Typography variant="body2" fontWeight="bold">{item.value}</Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
