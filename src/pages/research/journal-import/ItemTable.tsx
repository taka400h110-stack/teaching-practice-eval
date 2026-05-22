/**
 * 取り込み行テーブル (共通)
 * グルーピング表示・フラット表示の両方から利用される
 */
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";

import { humanFileSize } from "./utils";
import { STATUS_COLORS, STATUS_LABELS, type ImportItem } from "./types";

export interface ItemTableProps {
  items: ImportItem[];
  showStudent?: boolean;
  onView: (it: ImportItem) => void;
  onEdit: (it: ImportItem) => void;
  onDetail: (it: ImportItem) => void;
  onStructure: (id: string) => void;
  onCommit: (id: string) => void;
  onStructureGroup?: (items: ImportItem[]) => void;
  onCommitGroup?: (items: ImportItem[]) => void;
  onDelete: (it: ImportItem) => void;
  onOpenJournal: (jid: string) => void;
  structurePending: boolean;
  commitPending: boolean;
}

export function ItemTable(props: ItemTableProps) {
  const {
    items,
    showStudent,
    onView,
    onEdit,
    onDetail,
    onStructure,
    onCommit,
    onDelete,
    onOpenJournal,
    structurePending,
    commitPending,
  } = props;

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ファイル</TableCell>
            {showStudent && <TableCell>学生</TableCell>}
            <TableCell>日付</TableCell>
            <TableCell>週</TableCell>
            <TableCell>状態</TableCell>
            <TableCell>抽出元</TableCell>
            <TableCell>サイズ</TableCell>
            <TableCell>文字数</TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((it) => (
            <TableRow key={it.id} hover>
              <TableCell>
                <Stack direction="row" spacing={1} alignItems="center">
                  <DescriptionIcon fontSize="small" color="action" />
                  <Tooltip title={it.filename}>
                    <Typography
                      variant="body2"
                      sx={{
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                      }}
                      onClick={() => onDetail(it)}
                    >
                      {it.filename}
                    </Typography>
                  </Tooltip>
                </Stack>
                {it.error_message && (
                  <Tooltip title={it.error_message}>
                    <Chip
                      size="small"
                      color="error"
                      icon={<ErrorOutlineIcon />}
                      label="エラー詳細"
                      sx={{ mt: 0.5 }}
                    />
                  </Tooltip>
                )}
              </TableCell>
              {showStudent && (
                <TableCell>
                  {it.student_name || (
                    <Typography variant="caption" color="text.secondary">
                      未指定
                    </Typography>
                  )}
                </TableCell>
              )}
              <TableCell>{it.entry_date || "—"}</TableCell>
              <TableCell>{it.week_number != null ? `第${it.week_number}週` : "—"}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  color={STATUS_COLORS[it.status] || "default"}
                  label={STATUS_LABELS[it.status] || it.status}
                  icon={
                    ["extracting", "structuring", "committing"].includes(it.status) ? (
                      <HourglassEmptyIcon sx={{ fontSize: 14 }} />
                    ) : undefined
                  }
                />
              </TableCell>
              <TableCell>
                {it.extract_source ? (
                  <Chip size="small" label={it.extract_source} variant="outlined" />
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>{humanFileSize(it.file_size)}</TableCell>
              <TableCell>{it.word_count ?? "—"}</TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  <Tooltip title="詳細ページを開く">
                    <IconButton size="small" onClick={() => onDetail(it)}>
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="閲覧 (読み取り専用)">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => onView(it)}
                        disabled={!it.structured_json && !it.raw_text}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {it.status === "extracted" && (
                    <Tooltip title="GPT-4 で構造化">
                      <IconButton
                        size="small"
                        onClick={() => onStructure(it.id)}
                        disabled={structurePending}
                      >
                        <AutoFixHighIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {["structured", "extracted", "failed"].includes(it.status) && (
                    <Tooltip title="編集">
                      <IconButton size="small" onClick={() => onEdit(it)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {it.status === "structured" && (
                    <Tooltip
                      title={
                        !it.student_id
                          ? "学生を指定してください"
                          : !it.entry_date
                            ? "日付を指定してください"
                            : "journal_entries にコミット"
                      }
                    >
                      <span>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => onCommit(it.id)}
                          disabled={!it.student_id || !it.entry_date || commitPending}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  {it.status === "committed" && it.journal_id && (
                    <Tooltip title="日誌を開く">
                      <IconButton size="small" onClick={() => onOpenJournal(it.journal_id!)}>
                        <CheckCircleIcon fontSize="small" color="success" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="削除 (取り込み記録のみ)">
                    <IconButton size="small" color="error" onClick={() => onDelete(it)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
