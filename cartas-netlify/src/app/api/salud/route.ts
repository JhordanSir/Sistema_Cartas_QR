import { isDatabaseUp } from '@/server/health';

export async function GET(): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store' };
  if (await isDatabaseUp()) {
    return Response.json({ ok: true, database: 'up' }, { headers });
  }
  return Response.json({ ok: false }, { status: 503, headers });
}
