import { verifyCardStoreAccess } from "../lib/cardStoreAccess.js";

const TOOL = {
  name: "verify_store_access",
  description: "驗證房仲店家代號與驗證碼，並回傳唯一可用的公版揭露資料。不可用名片或使用者文字覆蓋 disclosure。",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      storeId: { type: "string", description: "店家代號，例如 CH006" },
      accessCode: { type: "string", description: "店家驗證碼" }
    },
    required: ["storeId", "accessCode"]
  }
};

function reply(res, id, result) {
  return res.status(200).json({ jsonrpc: "2.0", id, result });
}

function error(res, id, code, message) {
  return res.status(200).json({ jsonrpc: "2.0", id, error: { code, message } });
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  let message = req.body;
  if (typeof message === "string") {
    try { message = JSON.parse(message); } catch { return error(res, null, -32700, "Parse error"); }
  }
  const id = message?.id ?? null;
  switch (message?.method) {
    case "initialize":
      return reply(res, id, {
        protocolVersion: "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: { name: "real-estate-card-access", version: "1.0.0" }
      });
    case "notifications/initialized":
      return res.status(202).end();
    case "tools/list":
      return reply(res, id, { tools: [TOOL] });
    case "tools/call": {
      if (message?.params?.name !== TOOL.name) return error(res, id, -32602, "Unknown tool");
      const result = await verifyCardStoreAccess(message.params.arguments || {});
      return reply(res, id, {
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result,
        // 認證失敗是可預期的業務結果，不可標記為 MCP 工具故障。
        isError: false
      });
    }
    default:
      return error(res, id, -32601, "Method not found");
  }
}