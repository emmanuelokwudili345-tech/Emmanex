import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import express from "express";
import { after, before, test } from "node:test";
import { errorHandler, notFoundHandler } from "../../middleware/error-handler.js";
import { createCatalogRouter } from "./catalog-routes.js";

const product = {
  id: "product-1",
  name: "Canvas Tote",
  slug: "canvas-tote",
  description: "Everyday carry bag",
  price: "18500.00",
  imageUrl: "https://example.com/tote.jpg",
  category: { id: "category-1", name: "Fashion", slug: "fashion" },
  inStock: true,
};
const category = {
  id: "category-1",
  name: "Fashion",
  slug: "fashion",
  description: "Everyday accessories",
};

function createTestServer(products = [product]) {
  const calls: Array<Record<string, unknown>> = [];
  const app = express();
  app.use(
    "/api",
    createCatalogRouter({
      async listProducts(query) {
        calls.push({ ...query });
        return products;
      },
      async findProductBySlug(slug) {
        return slug === product.slug ? product : undefined;
      },
      async listCategories() {
        return [category];
      },
      async findCategoryBySlug(slug) {
        return slug === category.slug ? category : undefined;
      },
    }),
  );
  app.use(notFoundHandler);
  app.use(errorHandler);
  const server: Server = createServer(app);

  return {
    app,
    calls,
    async start() {
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      return `http://127.0.0.1:${address.port}`;
    },
    async close() {
      if (!server.listening) return;
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

let baseUrl: string;
let testServer: ReturnType<typeof createTestServer>;

before(async () => {
  testServer = createTestServer();
  baseUrl = await testServer.start();
});

after(async () => {
  await testServer.close();
});

test("product listing returns products and pagination metadata", async () => {
  const response = await fetch(`${baseUrl}/api/products?limit=2&page=1`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "success",
    message: "Products retrieved successfully.",
    data: {
      products: [product],
      pagination: { page: 1, limit: 2, hasMore: false },
    },
  });
  assert.deepEqual(testServer.calls.at(-1), { page: 1, limit: 2 });
});

test("product listing rejects invalid pagination and search values", async () => {
  for (const query of ["page=0", "limit=51", "page=1.5", "search=" + "a".repeat(101)]) {
    const response = await fetch(`${baseUrl}/api/products?${query}`);
    assert.equal(response.status, 400, query);
    assert.equal((await response.json()).status, "error");
  }
});

test("product detail returns 404 for unknown slugs", async () => {
  const response = await fetch(`${baseUrl}/api/products/not-a-product`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    status: "error",
    message: "Product not found.",
  });
});

test("categories returns the public category list", async () => {
  const response = await fetch(`${baseUrl}/api/categories`);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data.categories, [category]);
});

test("category product route validates the category and applies its slug", async () => {
  const response = await fetch(`${baseUrl}/api/categories/fashion/products?search=tote`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.data.category.slug, "fashion");
  assert.deepEqual(testServer.calls.at(-1), {
    page: 1,
    limit: 12,
    search: "tote",
    categorySlug: "fashion",
  });

  const missing = await fetch(`${baseUrl}/api/categories/unknown/products`);
  assert.equal(missing.status, 404);
});
