import { and, asc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { Router } from "express";
import { successResponse } from "../../api-response.js";
import { db } from "../../db/index.js";
import { categories, products } from "../../db/schema.js";
import { HttpError } from "../../middleware/error-handler.js";

type ProductRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  category: { id: string; name: string; slug: string } | null;
  inStock: boolean;
};

type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

interface ProductQuery {
  page: number;
  limit: number;
  search?: string;
  categorySlug?: string;
}

interface CatalogDependencies {
  listProducts(query: ProductQuery): Promise<ProductRecord[]>;
  findProductBySlug(slug: string): Promise<ProductRecord | undefined>;
  listCategories(): Promise<CategoryRecord[]>;
  findCategoryBySlug(slug: string): Promise<CategoryRecord | undefined>;
}

function parsePositiveInteger(
  value: unknown,
  fallback: number,
  maximum: number,
  field: string,
): number {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new HttpError(400, `${field} must be a positive integer.`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new HttpError(
      400,
      `${field} must be between 1 and ${maximum}.`,
    );
  }

  return parsed;
}

function parseProductQuery(query: Record<string, unknown>): ProductQuery {
  const page = parsePositiveInteger(query.page, 1, 1_000_000, "page");
  const limit = parsePositiveInteger(query.limit, 12, 50, "limit");
  let search: string | undefined;

  if (query.search !== undefined) {
    if (typeof query.search !== "string") {
      throw new HttpError(400, "search must be a string.");
    }

    const normalized = query.search.trim();
    if (normalized.length > 100) {
      throw new HttpError(400, "search must be 100 characters or fewer.");
    }
    if (normalized) search = normalized;
  }

  return { page, limit, ...(search ? { search } : {}) };
}

function createProductionDependencies(): CatalogDependencies {
  return {
    async listProducts(query) {
      const filters: SQL[] = [eq(products.isActive, true)];
      if (query.search) {
        const pattern = `%${query.search.replace(/[\\%_]/g, "\\$&")}%`;
        const searchFilter = or(
          ilike(products.name, pattern),
          ilike(products.description, pattern),
        );
        if (searchFilter) filters.push(searchFilter);
      }
      if (query.categorySlug) {
        filters.push(eq(categories.slug, query.categorySlug));
      }

      const rows = await db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          description: products.description,
          price: products.price,
          imageUrl: products.imageUrl,
          stock: products.stock,
          categoryId: categories.id,
          categoryName: categories.name,
          categorySlug: categories.slug,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(...filters))
        .orderBy(asc(products.name), asc(products.id))
        .limit(query.limit + 1)
        .offset((query.page - 1) * query.limit);

      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        price: row.price,
        imageUrl: row.imageUrl,
        category:
          row.categoryId && row.categoryName && row.categorySlug
            ? {
                id: row.categoryId,
                name: row.categoryName,
                slug: row.categorySlug,
              }
            : null,
        inStock: row.stock > 0,
      }));
    },

    async findProductBySlug(slug) {
      const [row] = await db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          description: products.description,
          price: products.price,
          imageUrl: products.imageUrl,
          stock: products.stock,
          categoryId: categories.id,
          categoryName: categories.name,
          categorySlug: categories.slug,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(eq(products.slug, slug), eq(products.isActive, true)))
        .limit(1);

      if (!row) return undefined;
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        price: row.price,
        imageUrl: row.imageUrl,
        category:
          row.categoryId && row.categoryName && row.categorySlug
            ? {
                id: row.categoryId,
                name: row.categoryName,
                slug: row.categorySlug,
              }
            : null,
        inStock: row.stock > 0,
      };
    },

    async listCategories() {
      return db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
        })
        .from(categories)
        .where(
          sql`exists (
            select 1 from ${products}
            where ${products.categoryId} = ${categories.id}
              and ${products.isActive} = true
          )`,
        )
        .orderBy(asc(categories.name));
    },

    async findCategoryBySlug(slug) {
      const [category] = await db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
        })
        .from(categories)
        .where(eq(categories.slug, slug))
        .limit(1);
      return category;
    },
  };
}

export function createCatalogRouter(
  dependencies: CatalogDependencies = createProductionDependencies(),
) {
  const router = Router();

  router.get("/products", async (req, res, next) => {
    try {
      const query = parseProductQuery(req.query as Record<string, unknown>);
      const rows = await dependencies.listProducts(query);
      const hasMore = rows.length > query.limit;
      const productsForPage = hasMore ? rows.slice(0, query.limit) : rows;

      res.json(
        successResponse("Products retrieved successfully.", {
          products: productsForPage,
          pagination: { page: query.page, limit: query.limit, hasMore },
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.get("/products/:slug", async (req, res, next) => {
    try {
      const product = await dependencies.findProductBySlug(req.params.slug);
      if (!product) throw new HttpError(404, "Product not found.");
      res.json(successResponse("Product retrieved successfully.", { product }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/categories", async (_req, res, next) => {
    try {
      const categoryList = await dependencies.listCategories();
      res.json(
        successResponse("Categories retrieved successfully.", {
          categories: categoryList,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.get("/categories/:slug/products", async (req, res, next) => {
    try {
      const category = await dependencies.findCategoryBySlug(req.params.slug);
      if (!category) throw new HttpError(404, "Category not found.");

      const query = parseProductQuery(req.query as Record<string, unknown>);
      const rows = await dependencies.listProducts({
        ...query,
        categorySlug: category.slug,
      });
      const hasMore = rows.length > query.limit;
      const productsForPage = hasMore ? rows.slice(0, query.limit) : rows;

      res.json(
        successResponse("Category products retrieved successfully.", {
          category,
          products: productsForPage,
          pagination: { page: query.page, limit: query.limit, hasMore },
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
