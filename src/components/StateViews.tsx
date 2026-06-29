/**
 * 全ページ共通の状態表示コンポーネント。
 * ローディング / エラー / 空状態の見た目を統一し、各ページのユーザビリティを揃える。
 */
import React from "react";
import { Box, CircularProgress, Typography, Button, Alert } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import InboxIcon from "@mui/icons-material/Inbox";

/** ローディング中央スピナー */
export function LoadingView({ label = "読み込み中…", minHeight = "40vh" }: { label?: string; minHeight?: number | string }) {
  return (
    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" gap={1.5} minHeight={minHeight} role="status" aria-live="polite">
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">{label}</Typography>
    </Box>
  );
}

/** エラー表示（再試行ボタン付き） */
export function ErrorView({ message = "データの取得に失敗しました。", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <Box display="flex" justifyContent="center" py={4}>
      <Alert
        severity="error"
        sx={{ maxWidth: 520, width: "100%" }}
        action={onRetry ? (
          <Button color="inherit" size="small" startIcon={<RefreshIcon />} onClick={onRetry}>
            再試行
          </Button>
        ) : undefined}
      >
        {message}
      </Alert>
    </Box>
  );
}

/** 空状態（アイコン + 説明 + 任意のアクション） */
export function EmptyView({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Box sx={{ textAlign: "center", py: 6, px: 2 }}>
      <Box sx={{ color: "text.disabled", mb: 1.5, "& svg": { fontSize: 48 } }}>
        {icon ?? <InboxIcon />}
      </Box>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: action ? 2 : 0 }}>
          {description}
        </Typography>
      )}
      {action}
    </Box>
  );
}
