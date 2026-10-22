import { and, eq, gt } from "drizzle-orm";
import { HttpError } from "../../middleware/error-handler.js";
import { sessions, users } from "../../db/schema.js";
import type {
  AuthRepository,
  NewSession,
  PublicUser,
  StoredUser,
} from "./auth-types.js";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export class DrizzleAuthRepository implements AuthRepository {
  async createUser(
    input: Omit<import("./auth-types.js").RegistrationInput, "password"> & {
      passwordHash: string;
    },
  ): Promise<PublicUser> {
    try {
      const { db } = await import("../../db/index.js");
      const [user] = await db
        .insert(users)
        .values(input)
        .returning({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
        });

      if (!user) {
        throw new Error("User insert returned no row.");
      }
      return user;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new HttpError(409, "An account with that email already exists.");
      }
      throw error;
    }
  }

  async findUserByEmail(email: string): Promise<StoredUser | null> {
    const { db } = await import("../../db/index.js");
    const [user] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        passwordHash: users.passwordHash,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user ?? null;
  }

  async createSession(session: NewSession): Promise<void> {
    const { db } = await import("../../db/index.js");
    await db.insert(sessions).values(session);
  }

  async findActiveSession(
    tokenHash: string,
    now: Date,
  ): Promise<{
    user: PublicUser;
    tokenHash: string;
    csrfTokenHash: string;
    expiresAt: Date;
  } | null> {
    const { db } = await import("../../db/index.js");
    const [row] = await db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        tokenHash: sessions.tokenHash,
        csrfTokenHash: sessions.csrfTokenHash,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          gt(sessions.expiresAt, now),
          eq(users.isActive, true),
        ),
      )
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      user: {
        id: row.userId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        role: row.role,
      },
      tokenHash: row.tokenHash,
      csrfTokenHash: row.csrfTokenHash,
      expiresAt: row.expiresAt,
    };
  }

  async updateCsrfTokenHash(
    tokenHash: string,
    csrfTokenHash: string,
  ): Promise<boolean> {
    const { db } = await import("../../db/index.js");
    const updated = await db
      .update(sessions)
      .set({ csrfTokenHash })
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
      .returning({ id: sessions.id });

    return updated.length > 0;
  }

  async deleteSession(tokenHash: string): Promise<void> {
    const { db } = await import("../../db/index.js");
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }
}

export type { AuthRepository };
