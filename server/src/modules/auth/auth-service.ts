import { randomBytes } from "node:crypto";
import { HttpError } from "../../middleware/error-handler.js";
import { hashToken } from "./csrf.js";
import { hashPassword, verifyPassword } from "./password.js";
import type {
  AuthRepository,
  AuthOperations,
  IssuedSession,
  LoginInput,
  PublicUser,
  RegistrationInput,
  SessionPrincipal,
} from "./auth-types.js";

const dummyPasswordHash = hashPassword(randomBytes(32).toString("hex"));

export class AuthService implements AuthOperations {
  constructor(
    private readonly repository: AuthRepository,
    private readonly sessionDurationMs: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async register(input: RegistrationInput): Promise<IssuedSession> {
    const passwordHash = await hashPassword(input.password);
    const user = await this.repository.createUser({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      passwordHash,
    });

    return this.createSession(user);
  }

  async login(input: LoginInput): Promise<IssuedSession> {
    const user = await this.repository.findUserByEmail(input.email);
    const candidateHash = user?.passwordHash ?? (await dummyPasswordHash);
    const passwordMatches = await verifyPassword(input.password, candidateHash);

    if (!user || !user.isActive || !passwordMatches) {
      throw new HttpError(401, "Email or password is incorrect.");
    }

    return this.createSession(user);
  }

  async authenticate(token: string): Promise<SessionPrincipal | null> {
    return this.repository.findActiveSession(hashToken(token), this.now());
  }

  async rotateCsrfToken(tokenHash: string): Promise<string> {
    const csrfToken = randomBytes(32).toString("base64url");
    const updated = await this.repository.updateCsrfTokenHash(
      tokenHash,
      hashToken(csrfToken),
    );

    if (!updated) {
      throw new HttpError(401, "Authentication is required.");
    }

    return csrfToken;
  }

  async logout(token: string): Promise<void> {
    await this.repository.deleteSession(hashToken(token));
  }

  private async createSession(user: PublicUser): Promise<IssuedSession> {
    const token = randomBytes(32).toString("base64url");
    const csrfToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(this.now().getTime() + this.sessionDurationMs);

    await this.repository.createSession({
      userId: user.id,
      tokenHash: hashToken(token),
      csrfTokenHash: hashToken(csrfToken),
      expiresAt,
    });

    return { user, token, csrfToken, expiresAt };
  }
}
