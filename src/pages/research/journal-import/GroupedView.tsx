/**
 * 学生 → 週 でグルーピングしたアコーディオン表示
 */
import { useMemo } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PersonIcon from "@mui/icons-material/Person";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import { ItemTable, type ItemTableProps } from "./ItemTable";
import type { ImportItem } from "./types";

interface StudentGroup {
  studentId: string | null;
  studentName: string;
  items: ImportItem[];
  stats: {
    total: number;
    committed: number;
    structured: number;
    failed: number;
    pending: number;
  };
}

type SharedHandlers = Omit<ItemTableProps, "items" | "showStudent">;

export function GroupedView(
  props: SharedHandlers & {
    groups: StudentGroup[];
    onStructureGroup: (items: ImportItem[]) => void;
    onCommitGroup: (items: ImportItem[]) => void;
  },
) {
  const { groups, onStructureGroup, onCommitGroup, structurePending, commitPending } = props;
  return (
    <Stack spacing={1.5}>
      {groups.map((g) => {
        const extractedCount = g.items.filter((it) => it.status === "extracted").length;
        const readyCount = g.items.filter(
          (it) =>
            it.status === "structured" &&
            it.student_id &&
            it.entry_date &&
            it.structured_json,
        ).length;
        return (
          <Accordion key={g.studentId || "__unassigned__"} defaultExpanded={groups.length <= 5}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{ width: "100%" }}
                flexWrap="wrap"
                useFlexGap
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: g.studentId ? "primary.main" : "grey.400",
                  }}
                >
                  {g.studentId ? <PersonIcon fontSize="small" /> : <HelpOutlineIcon fontSize="small" />}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {g.studentName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {g.items.length} 件の取り込み
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {g.stats.committed > 0 && (
                    <Chip size="small" color="success" label={`確定 ${g.stats.committed}`} />
                  )}
                  {g.stats.structured > 0 && (
                    <Chip size="small" color="warning" label={`編集待 ${g.stats.structured}`} />
                  )}
                  {g.stats.pending > 0 && (
                    <Chip size="small" color="info" label={`処理中 ${g.stats.pending}`} />
                  )}
                  {g.stats.failed > 0 && (
                    <Chip size="small" color="error" label={`失敗 ${g.stats.failed}`} />
                  )}
                </Stack>
                {/* 学生グループ別の一括操作 */}
                <Stack
                  direction="row"
                  spacing={0.5}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                >
                  {extractedCount > 0 && (
                    <Tooltip title={`未構造化 ${extractedCount} 件を GPT-4 で構造化`}>
                      <span>
                        <Button
                          size="small"
                          startIcon={<AutoFixHighIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onStructureGroup(g.items);
                          }}
                          disabled={structurePending}
                        >
                          一括構造化 ({extractedCount})
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                  {readyCount > 0 && (
                    <Tooltip title={`確定可能な ${readyCount} 件を journal_entries にコミット`}>
                      <span>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircleIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onCommitGroup(g.items);
                          }}
                          disabled={commitPending}
                        >
                          一括コミット ({readyCount})
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                </Stack>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <WeekSubGroups items={g.items} {...props} />
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Stack>
  );
}

// ──────────────────────────────────────────────────────────────────
// 学生グループ内で「週」ごとにサブグルーピング
// ──────────────────────────────────────────────────────────────────
function WeekSubGroups(
  props: SharedHandlers & {
    items: ImportItem[];
  },
) {
  const { items } = props;
  const weeks = useMemo(() => {
    const map = new Map<string, ImportItem[]>();
    for (const it of items) {
      const key = it.week_number != null ? `第${it.week_number}週` : "週未設定";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <Box>
      {weeks.map(([weekKey, weekItems]) => (
        <Box key={weekKey}>
          <Box
            sx={{
              px: 2,
              py: 0.75,
              bgcolor: "grey.100",
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="body2" fontWeight="bold" color="text.secondary">
              {weekKey} ({weekItems.length})
            </Typography>
          </Box>
          <ItemTable items={weekItems} {...props} />
        </Box>
      ))}
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────
// フラットビュー
// ──────────────────────────────────────────────────────────────────
export function FlatView(props: SharedHandlers & { items: ImportItem[] }) {
  return (
    <Card>
      <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
        <ItemTable {...props} showStudent />
      </CardContent>
    </Card>
  );
}
