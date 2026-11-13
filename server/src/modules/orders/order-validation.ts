import { HttpError } from "../../middleware/error-handler.js";
import { findShippingOption } from "./shipping-options.js";
import type { DeliveryDetails } from "./order-types.js";

function requiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new HttpError(400, `${field} is required.`);
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new HttpError(400, `${field} must be between 1 and ${maxLength} characters.`);
  }

  return normalized;
}

function optionalText(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer.`);
  }

  return value.trim() || null;
}

function parseEmail(value: unknown): string {
  const email = requiredText(value, "Email address", 255).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "Enter a valid email address.");
  }

  return email;
}

function parsePhone(value: unknown): string {
  const phone = requiredText(value, "Phone number", 30);
  if (!/^[+\d][\d\s().-]{6,29}$/.test(phone)) {
    throw new HttpError(400, "Enter a valid phone number.");
  }

  return phone;
}

export function parseCheckoutRequest(value: unknown): DeliveryDetails {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HttpError(400, "Checkout details are invalid.");
  }

  const body = value as Record<string, unknown>;
  const state = requiredText(body.state, "State", 100);
  const shippingOption = findShippingOption(state);
  if (!shippingOption) {
    throw new HttpError(400, "Choose a valid Nigerian state or territory.");
  }
  if (body.deliveryMethod !== "standard") {
    throw new HttpError(400, "Choose a valid delivery method.");
  }
  if (body.paymentMethod !== "demo") {
    throw new HttpError(400, "Choose the demo payment method.");
  }

  return {
    recipientName: requiredText(body.recipientName, "Recipient name", 200),
    recipientEmail: parseEmail(body.recipientEmail),
    phone: parsePhone(body.phone),
    addressLine1: requiredText(body.addressLine1, "Street address", 255),
    addressLine2: optionalText(body.addressLine2, "Address line 2", 255),
    city: requiredText(body.city, "City", 100),
    state: shippingOption.state,
    postalCode: optionalText(body.postalCode, "Postal code", 20),
    deliveryMethod: "standard",
    paymentMethod: "demo",
  };
}

const customerOrderIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function findCustomerOrderId(value: unknown): string {
  if (typeof value !== "string" || !customerOrderIdPattern.test(value)) {
    throw new HttpError(400, "The order reference is invalid.");
  }

  return value;
}
