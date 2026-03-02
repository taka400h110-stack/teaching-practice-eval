import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Card, CardContent, Chip, MobileStepper,
  Step, StepLabel, Stepper, TextField, Typography,
  FormControl, InputLabel, Select, MenuItem, Alert,
} from "@mui/material";
import SchoolIcon        from "@mui/icons-material/School";
import PersonIcon        from "@mui/icons-material/Person";
import CheckCircleIcon   from "@mui/icons-material/CheckCircle";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import mockApi from "../api/client";

const STEPS = ["プロフィール設定", "実習情報入力", "目標設定", "完了"];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [profile, setProfile] = useState({
    name: "", grade: "2", school_type: "elementary",
    internship_type: "intensive", weeks: "10",
    school_name: "", supervisor: "",
  });
  const [goals, setGoals] = useState(["", "", ""]);

  const handleNext = () => {
    if (activeStep === STEPS.length - 1) {
      navigate("/dashboard");
    } else {
      setActiveStep((s) => s + 1);
    }
  };
  const handleBack = () => setActiveStep((s) => s - 1);

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="grey.50" p={2}>
      <Card sx={{ width: "100%", maxWidth: 600 }}>
        <CardContent sx={{ p: 4 }}>
          {/* ヘッダー */}
          <Box display="flex" alignItems="center" gap={1} mb={3}>
            <SchoolIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight="bold" color="primary">初期設定</Typography>
          </Box>

          {/* ステッパー */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {STEPS.map((label) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>

          {/* Step 0: プロフィール */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" mb={2}>あなたの情報を入力してください</Typography>
              <TextField label="氏名" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} fullWidth size="small" sx={{ mb: 2 }} />
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>学年</InputLabel>
                <Select value={profile.grade} label="学年" onChange={(e) => setProfile({ ...profile, grade: e.target.value })}>
                  {["1","2","3","4"].map((g) => <MenuItem key={g} value={g}>{g}年生</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>学校種別</InputLabel>
                <Select value={profile.school_type} label="学校種別" onChange={(e) => setProfile({ ...profile, school_type: e.target.value })}>
                  <MenuItem value="elementary">小学校</MenuItem>
                  <MenuItem value="middle">中学校</MenuItem>
                  <MenuItem value="high">高等学校</MenuItem>
                  <MenuItem value="special">特別支援学校</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Step 1: 実習情報 */}
          {activeStep === 1 && (
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" mb={2}>実習情報を入力してください</Typography>
              <TextField label="実習校名" value={profile.school_name} onChange={(e) => setProfile({ ...profile, school_name: e.target.value })} fullWidth size="small" sx={{ mb: 2 }} placeholder="〇〇市立△△小学校" />
              <TextField label="指導教員名" value={profile.supervisor} onChange={(e) => setProfile({ ...profile, supervisor: e.target.value })} fullWidth size="small" sx={{ mb: 2 }} />
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>実習形態</InputLabel>
                <Select value={profile.internship_type} label="実習形態" onChange={(e) => setProfile({ ...profile, internship_type: e.target.value })}>
                  <MenuItem value="intensive">集中実習</MenuItem>
                  <MenuItem value="distributed">分散実習</MenuItem>
                </Select>
              </FormControl>
              <TextField label="実習週数" type="number" value={profile.weeks} onChange={(e) => setProfile({ ...profile, weeks: e.target.value })} fullWidth size="small" slotProps={{ input: { inputProps: { min: 1, max: 15 } } }} />
            </Box>
          )}

          {/* Step 2: 目標設定 */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" mb={1}>実習の目標を設定してください（任意）</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>実習期間中に達成したい目標を3つまで記入できます。</Typography>
              {goals.map((g, i) => (
                <TextField key={i} label={`目標 ${i + 1}`} value={g} onChange={(e) => { const n = [...goals]; n[i] = e.target.value; setGoals(n); }}
                  fullWidth size="small" sx={{ mb: 2 }} placeholder="例：特別支援が必要な児童への指導を学ぶ" />
              ))}
            </Box>
          )}

          {/* Step 3: 完了 */}
          {activeStep === 3 && (
            <Box textAlign="center" py={2}>
              <CheckCircleIcon sx={{ fontSize: 64, color: "success.main", mb: 2 }} />
              <Typography variant="h5" fontWeight="bold" mb={1}>設定完了！</Typography>
              <Typography color="text.secondary" mb={3}>実習日誌の記録を始めましょう。</Typography>
              {profile.name && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
                  <Chip icon={<PersonIcon />} label={profile.name} color="primary" />
                  <Chip label={`${profile.grade}年生`} variant="outlined" />
                  <Chip label={profile.internship_type === "intensive" ? "集中実習" : "分散実習"} variant="outlined" />
                </Box>
              )}
            </Box>
          )}

          {/* ナビゲーション */}
          <Box display="flex" justifyContent="space-between" mt={4}>
            <Button onClick={handleBack} disabled={activeStep === 0} startIcon={<KeyboardArrowLeft />}>戻る</Button>
            <Button variant="contained" onClick={handleNext} endIcon={activeStep < STEPS.length - 1 ? <KeyboardArrowRight /> : undefined}>
              {activeStep === STEPS.length - 1 ? "ダッシュボードへ" : "次へ"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
