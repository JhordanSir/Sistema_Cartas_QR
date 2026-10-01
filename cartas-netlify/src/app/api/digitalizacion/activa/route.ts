import { getActiveJob } from '@/server/digitization/jobs';
import { handleApi, jsonResponse } from '@/server/http';
import { requireOwner } from '@/server/next/route-auth';

/** The job still running, if any, so the editor resumes following it (§E10). */
export function GET(request: Request): Promise<Response> {
  return handleApi(async () => {
    const { restaurant } = await requireOwner(request);
    return jsonResponse({ job: await getActiveJob(restaurant.id) });
  });
}
