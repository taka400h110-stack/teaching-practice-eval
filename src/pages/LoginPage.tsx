import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Card, CardContent, TextField, Typography, Alert, CircularProgress,
} from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import mockApi from "../api/client";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState("admin@teaching-eval.jp");
  const [password, setPassword] = useState("password");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await mockApi.login(email, password);
      navigate("/dashboard");
    } catch (e) {
      setError("ログインに失敗しました。メールアドレスとパスワードを確認してください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="grey.100">
      <Card sx={{ width: 380, p: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={3}>
            <SchoolIcon color="primary" sx={{ fontSize: 36 }} />
            <Typography variant="h5" fontWeight="bold" color="primary">
              教育実習評価システム
            </Typography>
          </Box>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            label="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          />
          <TextField
            label="パスワード"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 3 }}
          />
          <Button
            variant="contained"
            fullWidth
            onClick={handleLogin}
            disabled={loading}
            size="large"
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "ログイン"}
          </Button>
          <Typography variant="caption" color="text.secondary" display="block" mt={2} textAlign="center">
            デモ: admin@teaching-eval.jp / password
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
