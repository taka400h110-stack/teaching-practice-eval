import React from "react";
import { Box, Card, CardContent, Typography, Chip, Stack, Divider, Avatar } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import apiClient from "../api/client";

const ROLE_LABELS: Record<string, string> = {
  student: "実習生",
  univ_teacher: "大学教員",
  teacher: "教員",
  school_mentor: "学校メンター",
  evaluator: "評価者",
  admin: "管理者",
  researcher: "研究者",
  collaborator: "共同研究者",
  board_observer: "委員会オブザーバ",
};

export default function ProfilePage() {
  const user = apiClient.getCurrentUser() as any;
  const role: string = user?.role || user?.roles?.[0] || "unknown";
  const roleLabel = ROLE_LABELS[role] || role;

  return (
    <Box p={3} maxWidth={720} mx="auto">
      <Typography variant="h5" fontWeight={700} gutterBottom>
        <PersonIcon sx={{ mr: 1, verticalAlign: "middle" }} />
        プロフィール
      </Typography>

      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: "primary.main" }}>
              {(user?.name || "?").slice(0, 1)}
            </Avatar>
            <Box>
              <Typography variant="h6">{user?.name || "(名前未設定)"}</Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email || "(メール未設定)"}
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={1.5}>
            <InfoRow label="ユーザID" value={user?.id || "—"} />
            <InfoRow
              label="役割"
              value={<Chip size="small" color="primary" label={roleLabel} />}
            />
            <InfoRow label="ロール (raw)" value={role} />
            {user?.cohort_id && <InfoRow label="コホート" value={user.cohort_id} />}
            {user?.course_id && <InfoRow label="コース" value={user.course_id} />}
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Typography variant="caption" color="text.secondary">
            ※ プロフィール編集機能は今後のリリースで実装予定です。情報の修正が必要な場合は管理者にご連絡ください。
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
        {label}
      </Typography>
      <Box>{typeof value === "string" ? <Typography variant="body2">{value}</Typography> : value}</Box>
    </Stack>
  );
}
