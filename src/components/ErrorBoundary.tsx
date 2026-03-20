import React, { Component, ErrorInfo } from "react";
import { Box, Typography, Button, Paper } from "@mui/material";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="#f5f5f5" p={3}>
          <Paper sx={{ p: 4, maxWidth: 600, width: "100%", textAlign: "center" }}>
            <Typography variant="h5" color="error" gutterBottom>
              システムエラーが発生しました
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              予期せぬエラーが発生したため、画面を表示できません。
            </Typography>
            {this.state.error && (
              <Box bgcolor="#ffebee" p={2} borderRadius={1} mb={3} textAlign="left" overflow="auto">
                <Typography variant="body2" component="pre" sx={{ wordWrap: "break-word", whiteSpace: "pre-wrap" }}>
                  {this.state.error.toString()}
                </Typography>
              </Box>
            )}
            <Button variant="contained" color="primary" onClick={this.handleReload}>
              画面を再読み込みする
            </Button>
            <Box mt={4}>
              <Typography variant="caption" color="text.secondary">
                Build Info: {document.documentElement.dataset.buildId || "dev"}
              </Typography>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
