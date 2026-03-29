
import { CleanupFailureAlertResponse } from '../../types/adminAlerts';

export function buildCleanupAlertEmail(alert: CleanupFailureAlertResponse, appBaseUrl: string) {
  const detailUrl = `${appBaseUrl}/admin/system?tab=alerts`;
  const subject = `[Admin Alert] Cleanup failures detected (${alert.errorCount} errors)`;
  
  const formattedDate = alert.lastErrorAt ? new Date(alert.lastErrorAt).toLocaleString() : 'N/A';
  const topReason = alert.topReasons?.[0]?.reason ?? 'unknown';

  const text = `
直近${alert.rangeHours}時間で cleanup 処理に ${alert.errorCount} 件のエラーが記録されました。
最終エラー時刻: ${formattedDate}
最新 run outcome: ${alert.latestRunOutcome}
主な原因: ${topReason}

詳細: ${detailUrl}
  `.trim();

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background-color: ${alert.severity === 'critical' ? '#d32f2f' : '#ed6c02'}; color: white; padding: 16px;">
        <h2 style="margin: 0;">Cleanup Failure Alert (${alert.severity.toUpperCase()})</h2>
      </div>
      <div style="padding: 16px;">
        <p>直近<strong>${alert.rangeHours}時間</strong>で cleanup 処理に <strong>${alert.errorCount}</strong> 件のエラーが記録されました。</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">最新の実行結果</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${alert.latestRunOutcome}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">最終エラー時刻</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">主な原因</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${topReason}</td>
          </tr>
        </table>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${detailUrl}" style="background-color: #1976d2; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; display: inline-block;">
            詳細を確認する
          </a>
        </div>
      </div>
    </div>
  `;

  return { subject, text, html };
}
