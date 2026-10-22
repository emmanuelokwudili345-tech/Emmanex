export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface RegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface StoredUser extends PublicUser {
  passwordHash: string;
  isActive: boolean;
}

export interface SessionPrincipal {
  user: PublicUser;
  tokenHash: string;
  csrfTokenHash: string;
  expiresAt: Date;
}

export interface NewSession {
  userId: string;
  tokenHash: string;
  csrfTokenHash: string;
  expiresAt: Date;
}

export interface AuthRepository {
  createUser(input: Omit<RegistrationInput, "password"> & {
    passwordHash: string;
  }): Promise<PublicUser>;
  findUserByEmail(email: string): Promise<StoredUser | null>;
  createSession(session: NewSession): Promise<void>;
  findActiveSession(tokenHash: string, now: Date): Promise<SessionPrincipal | null>;
  updateCsrfTokenHash(tokenHash: string, csrfTokenHash: string): Promise<boolean>;
  deleteSession(tokenHash: string): Promise<void>;
}

export interface IssuedSession {
  user: PublicUser;
  token: string;
  csrfToken: string;
  expiresAt: Date;
}

export interface AuthOperations {
  register(input: RegistrationInput): Promise<IssuedSession>;
  login(input: LoginInput): Promise<IssuedSession>;
  authenticate(token: string): Promise<SessionPrincipal | null>;
  rotateCsrfToken(tokenHash: string): Promise<string>;
  logout(token: string): Promise<void>;
}
