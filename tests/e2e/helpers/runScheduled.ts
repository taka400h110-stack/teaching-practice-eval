import { APIRequestContext } from '@playwright/test';

export async function runScheduled(request: APIRequestContext, cron: string, time?: number) {
  const qs = new URLSearchParams({ cron });
  if (time) qs.set('time', String(time));
  const res = await request.get(`/cdn-cgi/handler/scheduled?${qs.toString()}`);
  return res;
}
