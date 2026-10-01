import { expect, type APIRequestContext } from '@playwright/test';

type DraftResponse = {
  draft: {
    categories: {
      id: string;
      name: string;
      products: { id: string; name: string; imageUrl: string | null }[];
    }[];
  };
};

function originHeader(baseURL: string | undefined): { Origin: string } {
  return { Origin: new URL(baseURL ?? 'http://localhost:8888').origin };
}

/** Creates a section through the API and returns its id. */
export async function createSectionViaApi(
  request: APIRequestContext,
  name: string,
  baseURL: string | undefined,
): Promise<string> {
  const response = await request.post('/api/carta/secciones', {
    data: { name },
    headers: originHeader(baseURL),
  });
  expect(response.status()).toBe(201);
  const { draft } = (await response.json()) as DraftResponse;
  const section = draft.categories.find((category) => category.name === name);
  if (!section) throw new Error(`Section ${name} was not created`);
  return section.id;
}

/** Creates a product through the API and returns its id. */
export async function createProductViaApi(
  request: APIRequestContext,
  product: { categoryId: string; name: string; basePrice: string },
  baseURL: string | undefined,
): Promise<string> {
  const response = await request.post('/api/carta/productos', {
    data: product,
    headers: originHeader(baseURL),
  });
  expect(response.status()).toBe(201);
  const { draft } = (await response.json()) as DraftResponse;
  const created = draft.categories
    .find((category) => category.id === product.categoryId)
    ?.products.find(({ name }) => name === product.name);
  if (!created) throw new Error(`Product ${product.name} was not created`);
  return created.id;
}
