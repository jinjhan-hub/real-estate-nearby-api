import { verifyCardStoreAccess } from "../lib/cardStoreAccess.js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ verified: false, success: false, reason: "METHOD_NOT_ALLOWED", message: "Only POST is allowed" });
  }

  let body = req.body || {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ verified: false, success: false, reason: "INVALID_JSON", message: "Invalid JSON body" });
    }
  }
  return res.status(200).json(await verifyCardStoreAccess(body));
}