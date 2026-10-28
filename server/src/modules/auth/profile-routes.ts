import { and, eq, ne, sql } from "drizzle-orm";
import { Router, type RequestHandler } from "express";
import { successResponse } from "../../api-response.js";
import { getAuthConfig } from "../../config/env.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { HttpError } from "../../middleware/error-handler.js";
import { requireNeonAuth } from "./neon-auth-middleware.js";

interface NeonAuthRecord {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  isActivelyBanned: boolean;
}

type CustomerProfile = typeof users.$inferSelect;

interface ProfileRouteDependencies {
  getAuthUser(id: string): Promise<NeonAuthRecord | null>;
  findByNeonId(id: string): Promise<CustomerProfile | undefined>;
  findByEmail(email: string): Promise<CustomerProfile | undefined>;
  findEmailOwner(
    email: string,
    excludedUserId: string,
  ): Promise<boolean>;
  updateEmail(
    userId: string,
    email: string,
  ): Promise<CustomerProfile | undefined>;
  createCustomer(input: {
    firstName: string;
    lastName: string;
    email: string;
    neonAuthUserId: string;
  }): Promise<CustomerProfile | undefined>;
}

function splitName(name: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (parts.length < 2) {
    throw new HttpError(
      422,
      "Your account must have a first and last name before a profile can be created.",
    );
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function publicProfile(user: CustomerProfile) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  };
}

function createProductionDependencies(): ProfileRouteDependencies {
  return {
    async getAuthUser(id) {
      const result = await db.execute(sql`
        SELECT
          "id",
          "email",
          "name",
          "emailVerified",
          (
            COALESCE("banned", false) = true
            AND (
              "banExpires" IS NULL
              OR "banExpires" > NOW()
            )
          ) AS "isActivelyBanned"
        FROM neon_auth."user"
        WHERE "id" = ${id}
        LIMIT 1
      `);

      const row = result.rows[0];

      if (
        !row ||
        typeof row.id !== "string" ||
        typeof row.email !== "string" ||
        (typeof row.name !== "string" && row.name !== null) ||
        typeof row.emailVerified !== "boolean" ||
        typeof row.isActivelyBanned !== "boolean"
      ) {
        return null;
      }

      return {
        id: row.id,
        email: row.email,
        name: row.name,
        emailVerified: row.emailVerified,
        isActivelyBanned: row.isActivelyBanned,
      };
    },

    async findByNeonId(id) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.neonAuthUserId, id))
        .limit(1);

      return user;
    },

    async findByEmail(email) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      return user;
    },

    async findEmailOwner(email, excludedUserId) {
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.email, email),
            ne(users.id, excludedUserId),
          ),
        )
        .limit(1);

      return Boolean(user);
    },

    async updateEmail(userId, email) {
      const [user] = await db
        .update(users)
        .set({
          email,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      return user;
    },

    async createCustomer(input) {
      const [user] = await db
        .insert(users)
        .values({
          ...input,
          role: "customer",
          isActive: true,
        })
        .onConflictDoNothing()
        .returning();

      return user;
    },
  };
}

export function createProfileRouter(
  dependencies: ProfileRouteDependencies = createProductionDependencies(),
  authenticate: RequestHandler = requireNeonAuth(getAuthConfig()),
) {
  const router = Router();

  router.post("/profile", authenticate, async (req, res, next) => {
    try {
      const neonUserId = req.neonAuthUser?.id;

      if (!neonUserId) {
        throw new HttpError(401, "Authentication is required.");
      }

      const authUser = await dependencies.getAuthUser(neonUserId);

      if (!authUser || authUser.emailVerified !== true) {
        throw new HttpError(
          403,
          "A verified email address is required.",
        );
      }

      if (authUser.isActivelyBanned) {
        throw new HttpError(
          403,
          "This Neon Auth account is currently banned.",
        );
      }

      const email = authUser.email.trim().toLowerCase();

      if (!email) {
        throw new HttpError(
          403,
          "A verified email address is required.",
        );
      }

      const linkedUser = await dependencies.findByNeonId(neonUserId);

      if (linkedUser) {
        if (!linkedUser.isActive) {
          throw new HttpError(403, "This account is inactive.");
        }

        const emailOwnedByAnotherUser =
          await dependencies.findEmailOwner(email, linkedUser.id);

        if (emailOwnedByAnotherUser) {
          throw new HttpError(
            409,
            "This email is already linked to another Emmanex profile.",
          );
        }

        if (linkedUser.email !== email) {
          const updatedUser = await dependencies.updateEmail(
            linkedUser.id,
            email,
          );

          if (!updatedUser) {
            throw new HttpError(
              500,
              "Unable to retrieve the customer profile.",
            );
          }

          res.json(
            successResponse(
              "Customer profile retrieved successfully.",
              publicProfile(updatedUser),
            ),
          );
          return;
        }

        res.json(
          successResponse(
            "Customer profile retrieved successfully.",
            publicProfile(linkedUser),
          ),
        );
        return;
      }

      const existingEmail = await dependencies.findByEmail(email);

      if (existingEmail) {
        throw new HttpError(
          409,
          "A profile already exists for this email. Account linking requires a separate, verified process.",
        );
      }

      const { firstName, lastName } = splitName(authUser.name);

      const createdUser = await dependencies.createCustomer({
        firstName,
        lastName,
        email,
        neonAuthUserId: neonUserId,
      });

      if (createdUser) {
        res.status(201).json(
          successResponse(
            "Customer profile created successfully.",
            publicProfile(createdUser),
          ),
        );
        return;
      }

      // Another request may have created the profile concurrently.
      const concurrentUser =
        await dependencies.findByNeonId(neonUserId);

      if (concurrentUser) {
        if (!concurrentUser.isActive) {
          throw new HttpError(403, "This account is inactive.");
        }

        res.json(
          successResponse(
            "Customer profile retrieved successfully.",
            publicProfile(concurrentUser),
          ),
        );
        return;
      }

      throw new HttpError(
        409,
        "A conflicting customer profile already exists.",
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
