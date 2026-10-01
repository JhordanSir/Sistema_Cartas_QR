import { describeErrorForLog } from '@/server/db-errors';
import { handleApi } from '@/server/http';
import { assertSameOrigin } from '@/server/origin';
import { recordView } from '@/server/views';

type Context = RouteContext<'/api/vistas/[slug]'>;

/**
 * A visit to the public menu (§E11). Like every write it must come from our
 * own pages; past that it always answers 204, whether or not it counted.
 */
export function POST(request: Request, context: Context): Promise<Response> {
  return handleApi(async () => {
    assertSameOrigin(request);
    const { slug } = await context.params;
    try {
      await recordView(slug, request.headers);
    } catch (error) {
      console.error('Could not record a view', describeErrorForLog(error));
    }
    return new Response(null, { status: 204 });
  });
}
