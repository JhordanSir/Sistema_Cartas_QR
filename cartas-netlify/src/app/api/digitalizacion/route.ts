import { createJob } from '@/server/digitization/jobs';
import { handleApi, jsonResponse } from '@/server/http';
import { requireOwner } from '@/server/next/route-auth';
import { assertSameOrigin } from '@/server/origin';

/** Starts a digitization (§E10): a job in UPLOADING, or 409 if one is already running. */
export function POST(request: Request): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const { restaurant } = await requireOwner(request);
    return jsonResponse({ job: await createJob(restaurant.id) }, 201);
  });
}
