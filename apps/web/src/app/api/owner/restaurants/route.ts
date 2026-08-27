import {
  authenticatedApiFetch,
  proxyApiResponse,
} from '@/lib/api-server';

export async function GET(): Promise<Response> {
  return proxyApiResponse(
    await authenticatedApiFetch('/api/owner/restaurants', {}, 'OWNER'),
  );
}
