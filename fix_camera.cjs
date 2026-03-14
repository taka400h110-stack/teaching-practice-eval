const fs = require('fs');
let code = fs.readFileSync('src/pages/JournalOCRPage.tsx', 'utf8');

// Add useRef to imports if not there, but it is there: React, { useState, useRef, useCallback }
// We need to add standard Dialog components, they are already imported.

// 1. Insert state and refs inside JournalOCRPage
const hookInsertionPoint = `  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false, message: "", severity: "info",
  });`;

const hookReplacement = `  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false, message: "", severity: "info",
  });

  // カメラ用State & Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch (err) {
      console.error("Camera error:", err);
      setSnackbar({ open: true, message: "カメラの起動に失敗しました。ブラウザのカメラアクセス権限を確認してください。", severity: "error" });
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], \`photo_\${Date.now()}.jpg\`, { type: "image/jpeg" });
            setSelectedFiles((prev) => [...prev, file].slice(0, 5));
            setActiveStep(0);
          }
        }, "image/jpeg", 0.9);
      }
    }
    stopCamera();
  };`;

code = code.replace(hookInsertionPoint, hookReplacement);

// 2. Modify the camera button onClick
const buttonOld = `<Button
                variant="contained"
                startIcon={<CameraAltIcon />}
                onClick={() => cameraInputRef.current?.click()}
              >
                カメラで撮影
              </Button>`;
const buttonNew = `<Button
                variant="contained"
                startIcon={<CameraAltIcon />}
                onClick={startCamera}
              >
                カメラで撮影
              </Button>`;

code = code.replace(buttonOld, buttonNew);

// 3. Add the Dialog for the camera at the end of the return
const dialogInsertionPoint = `{/* テキスト編集ダイアログ */}`;

const dialogReplacement = `{/* カメラ撮影ダイアログ */}
      <Dialog open={isCameraOpen} onClose={stopCamera} maxWidth="md" fullWidth>
        <DialogTitle>手書き日誌を撮影</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Box
            component="video"
            ref={videoRef}
            autoPlay
            playsInline
            muted
            sx={{ width: "100%", maxWidth: 500, borderRadius: 1, backgroundColor: "#000" }}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
          <Button onClick={stopCamera} variant="outlined" size="large">キャンセル</Button>
          <Button onClick={capturePhoto} variant="contained" color="primary" size="large" startIcon={<CameraAltIcon />}>
            撮影する
          </Button>
        </DialogActions>
      </Dialog>

      {/* テキスト編集ダイアログ */}`;

code = code.replace(dialogInsertionPoint, dialogReplacement);

fs.writeFileSync('src/pages/JournalOCRPage.tsx', code);
console.log("Updated JournalOCRPage.tsx");
