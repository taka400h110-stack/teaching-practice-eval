/**
 * 取り込み内容の編集 / 閲覧ダイアログ (viewOnly フラグで切替)
 */
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";

import { BLOCK_LABELS, type ImportItem, type Student, type StructuredJournal } from "./types";
import { emptyStructured, safeJson } from "./utils";

export function EditDialog({
  item,
  students,
  viewOnly,
  onClose,
  onSave,
  onRestructure,
  isSaving,
  isRestructuring,
}: {
  item: ImportItem;
  students: Student[];
  viewOnly: boolean;
  onClose: () => void;
  onSave: (patch: any) => Promise<void>;
  onRestructure: () => Promise<void>;
  isSaving: boolean;
  isRestructuring: boolean;
}) {
  const initialStructured: StructuredJournal = item.structured_json
    ? safeJson<StructuredJournal>(item.structured_json) || emptyStructured()
    : emptyStructured();

  const [studentId, setStudentId] = useState<string>(item.student_id || "");
  const [entryDate, setEntryDate] = useState<string>(
    item.entry_date || initialStructured.entry_date || "",
  );
  const [weekNumber, setWeekNumber] = useState<string>(
    item.week_number != null
      ? String(item.week_number)
      : initialStructured.week_number != null
        ? String(initialStructured.week_number)
        : "",
  );
  const [structured, setStructured] = useState<StructuredJournal>(initialStructured);
  const [showRawText, setShowRawText] = useState(viewOnly);

  const readOnly = viewOnly;

  const updateBlock = (key: string, value: string) => {
    setStructured((s) => ({
      ...s,
      blocks: { ...s.blocks, [key]: value },
    }));
  };

  const handleSave = async () => {
    const patch: any = {
      student_id: studentId || null,
      entry_date: entryDate || null,
      week_number: weekNumber === "" ? null : Number(weekNumber),
      structured: {
        ...structured,
        entry_date: entryDate || null,
        week_number: weekNumber === "" ? null : Number(weekNumber),
      },
    };
    await onSave(patch);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6">
              {viewOnly ? "取り込み内容の閲覧" : "取り込み内容の編集"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.filename}
            </Typography>
          </Box>
          {!viewOnly && (
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                startIcon={isRestructuring ? <CircularProgress size={14} /> : <AutoFixHighIcon />}
                onClick={onRestructure}
                disabled={isRestructuring || !item.raw_text}
              >
                GPT-4 で再構造化
              </Button>
              <Button size="small" onClick={() => setShowRawText((s) => !s)}>
                {showRawText ? "抽出原文を隠す" : "抽出原文を表示"}
              </Button>
            </Stack>
          )}
          {viewOnly && (
            <Button size="small" onClick={() => setShowRawText((s) => !s)}>
              {showRawText ? "抽出原文を隠す" : "抽出原文を表示"}
            </Button>
          )}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {item.error_message && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {item.error_message}
          </Alert>
        )}

        {structured.notes && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>GPT-4 抽出メモ:</strong> {structured.notes}
            {structured.confidence != null && (
              <span style={{ marginLeft: 8 }}>
                (信頼度 {Math.round(structured.confidence * 100)}%)
              </span>
            )}
          </Alert>
        )}

        {showRawText && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              抽出原文 (toMarkdown / Vision)
            </Typography>
            <Box
              sx={{
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
                fontSize: 12,
                maxHeight: 240,
                overflowY: "auto",
              }}
            >
              {item.raw_text || "(空)"}
            </Box>
          </Paper>
        )}

        <Stack spacing={2}>
          {/* メタ情報 */}
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <TextField
              select
              label="学生 (必須)"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              size="small"
              sx={{ minWidth: 240 }}
              required
              disabled={readOnly}
            >
              <MenuItem value="">— 選択してください —</MenuItem>
              {students.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} ({s.id})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="date"
              label="日付 (必須)"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              required
              disabled={readOnly}
            />
            <TextField
              type="number"
              label="週番号"
              value={weekNumber}
              onChange={(e) => setWeekNumber(e.target.value)}
              size="small"
              sx={{ width: 120 }}
              disabled={readOnly}
            />
            <TextField
              label="タイトル"
              value={structured.title || ""}
              onChange={(e) => setStructured({ ...structured, title: e.target.value })}
              size="small"
              sx={{ flex: 1, minWidth: 200 }}
              disabled={readOnly}
            />
          </Stack>

          <Divider>時限ブロック</Divider>

          {BLOCK_LABELS.map(({ key, label }) => (
            <TextField
              key={key}
              label={label}
              value={structured.blocks?.[key] || ""}
              onChange={(e) => updateBlock(key, e.target.value)}
              multiline
              minRows={1}
              maxRows={4}
              size="small"
              fullWidth
              disabled={readOnly}
            />
          ))}

          <Divider>省察・振り返り</Divider>

          <TextField
            label="省察・振り返り"
            value={structured.reflection || ""}
            onChange={(e) => setStructured({ ...structured, reflection: e.target.value })}
            multiline
            minRows={3}
            maxRows={10}
            fullWidth
            disabled={readOnly}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{viewOnly ? "閉じる" : "キャンセル"}</Button>
        {!viewOnly && (
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={16} /> : undefined}
          >
            保存
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
