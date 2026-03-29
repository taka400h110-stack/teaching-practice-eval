import { Env } from "../../types/env";
import { AnalyticsRange, DeliveryAnalyticsResponse } from "../../types/adminAnalytics";

export async function getDeliveryAnalytics(env: Env, range: AnalyticsRange): Promise<DeliveryAnalyticsResponse> {
  const db = env.DB;
  const days = range === "90d" ? 90 : range === "30d" ? 30 : 7;
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);
  const dateFromStr = dateFrom.toISOString();

  // 1. Get Notification Summaries
  const notifSummary = await db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN delivery_status IN ('bounced', 'dropped', 'complained', 'failed') THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN delivery_status = 'bounced' THEN 1 ELSE 0 END) as bounced,
      SUM(CASE WHEN delivery_status = 'dropped' THEN 1 ELSE 0 END) as dropped,
      SUM(CASE WHEN delivery_status = 'delivery_delayed' THEN 1 ELSE 0 END) as delayed
    FROM cleanup_alert_notifications
    WHERE created_at >= ?
  `).bind(dateFromStr).first<any>();

  const providerRes = await db.prepare(`
    SELECT 
      provider,
      COUNT(*) as total,
      SUM(CASE WHEN delivery_status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN delivery_status IN ('bounced', 'dropped', 'complained', 'failed') THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN delivery_status = 'bounced' THEN 1 ELSE 0 END) as bounced,
      SUM(CASE WHEN delivery_status = 'dropped' THEN 1 ELSE 0 END) as dropped,
      SUM(CASE WHEN delivery_status = 'complained' THEN 1 ELSE 0 END) as complained
    FROM cleanup_alert_notifications
    WHERE created_at >= ? AND provider IS NOT NULL
    GROUP BY provider
  `).bind(dateFromStr).all<any>();

  const breakdown = providerRes.results || [];
  const getProviderStat = (p: string, stat: string) => {
    const row = breakdown.find(r => r.provider === p);
    return row ? row[stat] : 0;
  };

  const total = notifSummary?.total || 0;
  const successRate = total > 0 ? (notifSummary.delivered / total) * 100 : 0;
  const bounceRate = total > 0 ? (notifSummary.bounced / total) * 100 : 0;

  // 2. Escalation Funnel
  // Find distinct fingerprints that had an alert created in this period
  const escalationRes = await db.prepare(`
    SELECT 
      COUNT(DISTINCT fingerprint) as total_alerts,
      SUM(CASE WHEN max_level >= 1 THEN 1 ELSE 0 END) as reached_l1,
      SUM(CASE WHEN max_level >= 2 THEN 1 ELSE 0 END) as reached_l2,
      SUM(CASE WHEN max_level >= 3 THEN 1 ELSE 0 END) as reached_l3
    FROM (
      SELECT fingerprint, MAX(level) as max_level
      FROM cleanup_alert_escalations
      WHERE triggered_at >= ?
      GROUP BY fingerprint
    )
  `).bind(dateFromStr).first<any>();

  const eTotal = escalationRes?.total_alerts || 0;
  const reachedL1 = escalationRes?.reached_l1 || 0;
  const reachedL2 = escalationRes?.reached_l2 || 0;
  const reachedL3 = escalationRes?.reached_l3 || 0;

  // 3. Daily Series
  const dailyRes = await db.prepare(`
    SELECT 
      date(created_at) as date_val,
      SUM(CASE WHEN delivery_status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN delivery_status = 'bounced' THEN 1 ELSE 0 END) as bounced,
      SUM(CASE WHEN delivery_status = 'dropped' THEN 1 ELSE 0 END) as dropped,
      SUM(CASE WHEN delivery_status IN ('bounced', 'dropped', 'complained', 'failed') THEN 1 ELSE 0 END) as failed
    FROM cleanup_alert_notifications
    WHERE created_at >= ?
    GROUP BY date_val
    ORDER BY date_val ASC
  `).bind(dateFromStr).all<any>();

  // Fill empty days
  const dailySeries = [];
  const currentDate = new Date(dateFrom);
  const end = new Date();
  while (currentDate <= end) {
    const dStr = currentDate.toISOString().split('T')[0];
    const row = dailyRes.results?.find(r => r.date_val === dStr);
    dailySeries.push({
      date: dStr,
      sent: row?.sent || 0,
      delivered: row?.delivered || 0,
      bounced: row?.bounced || 0,
      dropped: row?.dropped || 0,
      failed: row?.failed || 0
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 4. Recent Failures
  const recentFailures = await db.prepare(`
    SELECT 
      id, provider, provider_message_id, delivery_status, last_event_type, last_event_at, fingerprint, reason
    FROM cleanup_alert_notifications
    WHERE created_at >= ? AND delivery_status IN ('bounced', 'dropped', 'complained', 'failed')
    ORDER BY created_at DESC
    LIMIT 20
  `).bind(dateFromStr).all<any>();

  return {
    range,
    generatedAt: new Date().toISOString(),
    summary: {
      totalNotifications: total,
      deliveredCount: notifSummary?.delivered || 0,
      failedCount: notifSummary?.failed || 0,
      bouncedCount: notifSummary?.bounced || 0,
      droppedCount: notifSummary?.dropped || 0,
      deliveryDelayedCount: notifSummary?.delayed || 0,
      successRate,
      bounceRate,
      providerFailureRate: {
        resend: getProviderStat('resend', 'total') > 0 ? (getProviderStat('resend', 'failed') / getProviderStat('resend', 'total')) * 100 : 0,
        sendgrid: getProviderStat('sendgrid', 'total') > 0 ? (getProviderStat('sendgrid', 'failed') / getProviderStat('sendgrid', 'total')) * 100 : 0
      },
      escalationReachRate: {
        l1: eTotal > 0 ? (reachedL1 / eTotal) * 100 : 0,
        l2: eTotal > 0 ? (reachedL2 / eTotal) * 100 : 0,
        l3: eTotal > 0 ? (reachedL3 / eTotal) * 100 : 0
      }
    },
    providerBreakdown: breakdown.map(b => ({
      provider: b.provider as "resend" | "sendgrid",
      sent: b.sent,
      delivered: b.delivered,
      failed: b.failed,
      bounced: b.bounced,
      dropped: b.dropped,
      complained: b.complained,
      successRate: b.total > 0 ? (b.delivered / b.total) * 100 : 0,
      failureRate: b.total > 0 ? (b.failed / b.total) * 100 : 0
    })),
    dailySeries,
    escalationFunnel: {
      totalAlerts: eTotal,
      reachedL1: reachedL1,
      reachedL2: reachedL2,
      reachedL3: reachedL3,
      l1Rate: eTotal > 0 ? (reachedL1 / eTotal) * 100 : 0,
      l2Rate: eTotal > 0 ? (reachedL2 / eTotal) * 100 : 0,
      l3Rate: eTotal > 0 ? (reachedL3 / eTotal) * 100 : 0
    },
    recentFailures: (recentFailures.results || []).map(r => ({
      id: r.id,
      provider: r.provider,
      providerMessageId: r.provider_message_id,
      deliveryStatus: r.delivery_status,
      lastEventType: r.last_event_type,
      lastEventAt: r.last_event_at,
      fingerprint: r.fingerprint,
      reason: r.reason
    }))
  };
}
