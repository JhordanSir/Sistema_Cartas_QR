import { discardJob, getJob } from '@/server/digitization/jobs';
import { handleApi, jsonResponse, requireUuid } from '@/server/http';
import { requireOwner } from '@/server/next/route-auth';
import { assertSameOrigin } from '@/server/origin';

const JOB_NOT_FOUND = 'No encontramos esa digitalización.';

type Context = RouteContext<'/api/digitalizacion/[id]'>;

/** Status of a job; the editor asks every 3 s (§E10). */
export function GET(request: Request, context: Context): Promise<Response> {
  return handleApi(async () => {
    const { restaurant } = await requireOwner(request);
    const jobId = requireUuid((await context.params).id, JOB_NOT_FOUND);
    return jsonResponse({ job: await getJob(restaurant.id, jobId) });
  });
}

/** Gives up an upload interrupted halfway, so the menu is not locked for an hour. */
export function DELETE(request: Request, context: Context): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const { restaurant } = await requireOwner(request);
    const jobId = requireUuid((await context.params).id, JOB_NOT_FOUND);
    return jsonResponse({ job: await discardJob(restaurant.id, jobId) });
  });
}
