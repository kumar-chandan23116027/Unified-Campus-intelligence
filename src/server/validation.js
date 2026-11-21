import { badRequest } from "./errors.js";

export function requireObject(value, label = "Request body") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw badRequest(`${label} must be a JSON object`);
  }
  return value;
}

export function requireText(value, label, maxLength = 500) {
  if (typeof value !== "string" || !value.trim()) {
    throw badRequest(`${label} is required`);
  }
  const text = value.trim();
  if (text.length > maxLength) {
    throw badRequest(`${label} must be at most ${maxLength} characters`);
  }
  return text;
}

export function optionalText(value, label, maxLength = 500) {
  if (value === undefined || value === null || value === "") return null;
  return requireText(value, label, maxLength);
}

export function validateAssistantMessage(body) {
  requireObject(body, "Request body");
  return requireText(body.message, "message", 2000);
}
