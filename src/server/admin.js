import { readSourceDocument, writeSourceDocument } from "../data/store.js";
import { badRequest, forbidden, methodNotAllowed, notFound, unauthorized } from "./errors.js";
import { requireObject, requireText } from "./validation.js";
import { readJsonBody } from "./http.js";

const COLLECTIONS = {
  library: "books",
  events: "events",
  academics: "entries",
  cafeteria: "menu",
  hostel: "blocks"
};

function getRecordId(record) {
  return record.day || record.id;
}

export function requireAdmin(request) {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (!configuredKey) {
    throw forbidden("Admin operations are disabled because ADMIN_API_KEY is not configured");
  }
  const authorization = request.headers.authorization || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match || match[1] !== configuredKey) {
    throw unauthorized("A valid admin bearer token is required");
  }
}

export function validateAdminRecord(source, body) {
  requireObject(body, "Record");
  if (source === "library") {
    requireText(body.title, "title", 200);
    requireText(body.author, "author", 200);
    requireText(body.subject, "subject", 150);
  } else if (source === "events") {
    requireText(body.title, "title", 200);
    requireText(body.club, "club", 150);
    requireText(body.date, "date", 10);
    requireText(body.time, "time", 10);
    requireText(body.venue, "venue", 200);
  } else if (source === "academics") {
    requireText(body.title, "title", 200);
    requireText(body.summary, "summary", 1000);
    requireText(body.type, "type", 50);
  } else if (source === "hostel") {
    requireText(body.name, "name", 200);
    requireText(body.warden, "warden", 200);
  } else if (source === "cafeteria") {
    requireText(body.day, "day", 20);
    if (!Array.isArray(body.meals) || body.meals.length === 0) {
      throw badRequest("meals must contain at least one meal");
    }
  } else {
    throw notFound(`Unknown admin source "${source}"`);
  }
  return body;
}

export async function handleAdminRequest(request, response, source, recordId) {
  requireAdmin(request);
  if (!COLLECTIONS[source]) {
    throw notFound(`Unknown admin source "${source}"`);
  }

  if (request.method === "GET" && !recordId) {
    const payload = await readSourceDocument(source);
    return payload;
  }

  const payload = await readSourceDocument(source);
  const key = COLLECTIONS[source];
  const records = payload[key];

  if (request.method === "GET" && recordId) {
    const record = records.find((item) => getRecordId(item) === recordId);
    if (!record) throw notFound("Record not found");
    return record;
  }

  if (request.method === "POST" && !recordId) {
    const body = await readJsonBody(request);
    const record = validateAdminRecord(source, body);
    if (records.some((item) => getRecordId(item) === getRecordId(record))) {
      throw badRequest("A record with this id already exists");
    }
    if (record.title && records.some((item) => item.title?.toLowerCase() === record.title.toLowerCase())) {
      throw badRequest("A record with this title already exists");
    }
    if (!record.id && source !== "cafeteria") {
      record.id = `${source.slice(0, 3).toUpperCase()}-${Date.now()}`;
    }
    record.createdAt = new Date().toISOString();
    record.updatedAt = record.createdAt;
    records.push(record);
    payload[key] = records;
    writeSourceDocument(source, payload);
    return record;
  }

  if (!recordId) throw badRequest("A record id is required");
  const index = records.findIndex((item) => getRecordId(item) === recordId);
  if (index === -1) throw notFound("Record not found");

  if (request.method === "PATCH") {
    const body = await readJsonBody(request);
    const merged = validateAdminRecord(source, { ...records[index], ...body, id: recordId });
    merged.updatedAt = new Date().toISOString();
    records[index] = merged;
    payload[key] = records;
    writeSourceDocument(source, payload);
    return merged;
  }

  if (request.method === "DELETE") {
    const removed = records[index];
    records.splice(index, 1);
    payload[key] = records;
    writeSourceDocument(source, payload);
    return removed;
  }

  throw methodNotAllowed();
}
