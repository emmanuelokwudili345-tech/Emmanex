import { HttpError } from "../../middleware/error-handler.js";
import type { LoginInput, RegistrationInput } from "./auth-types.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseRegistrationInput(body: unknown): RegistrationInput {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(400, "Request body is invalid.");
  }

  const candidate = body as Record<string, unknown>;
  const firstName = typeof candidate.firstName === "string"
    ? candidate.firstName.trim()
    : "";
  const lastName = typeof candidate.lastName === "string"
    ? candidate.lastName.trim()
    : "";
  const email = typeof candidate.email === "string"
    ? candidate.email.trim().toLowerCase()
    : "";
  const password = candidate.password;

  if (
    firstName.length < 1 ||
    firstName.length > 100 ||
    lastName.length < 1 ||
    lastName.length > 100 ||
    email.length > 254 ||
    !EMAIL_PATTERN.test(email) ||
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128
  ) {
    throw new HttpError(400, "Registration details are invalid.");
  }

  return { firstName, lastName, email, password };
}

export function parseLoginInput(body: unknown): LoginInput {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(400, "Request body is invalid.");
  }

  const candidate = body as Record<string, unknown>;
  const email = typeof candidate.email === "string"
    ? candidate.email.trim().toLowerCase()
    : "";
  const password = candidate.password;

  if (
    email.length > 254 ||
    !EMAIL_PATTERN.test(email) ||
    typeof password !== "string" ||
    password.length < 1 ||
    password.length > 128
  ) {
    throw new HttpError(400, "Email or password is invalid.");
  }

  return { email, password };
}
