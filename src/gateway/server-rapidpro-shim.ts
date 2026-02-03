import type { IncomingMessage, ServerResponse } from "node:http";
import { activeSockets, createWaSocket } from "../web/session.js";

// Helper to write JSON response
function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export function createRapidProRequestHandler(opts: { adminToken: string }) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    const url = req.url || "";
    // Check if it's a RapidPro-compat request
    if (url === "/webhook" || url.startsWith("/session/")) {
      // Verify Auth
      const authHeaders = req.headers["authorization"] || "";
      if (
        !authHeaders.startsWith("tk_") &&
        opts.adminToken &&
        authHeaders !== opts.adminToken &&
        authHeaders !== `Bearer ${opts.adminToken}`
      ) {
        json(res, 403, { error: "Unauthorized" });
        return true;
      }

      if (url === "/webhook") {
        // RapidPro tries to configure the webhook, but we rely on the plugin environment setup.
        // Just return success to satisfy the check.
        json(res, 200, { status: "success" });
        return true;
      }

      if (url === "/session/hmac/config") {
        // RapidPro may try to configure HMAC. We accept it but don't enforce it yet.
        json(res, 200, { status: "success" });
        return true;
      }

      // Get active socket (Single Tenant Assumption: First one found)
      let entries = Array.from(activeSockets.values());
      let session = entries[0];

      if (!session) {
        // If no session exists, try to auto-create the default one for relevant endpoints
        if (url === "/session/qr" || url === "/session/status") {
          try {
            console.log("[RapidProShim] Auto-creating default WhatsApp session...");
            await createWaSocket(false, true);
            // Refresh session list
            entries = Array.from(activeSockets.values());
            session = entries[0];
          } catch (err) {
            console.error("[RapidProShim] Failed to auto-create session:", err);
          }
        }
      }

      if (!session) {
        json(res, 503, { error: "No active WhatsApp session found. Please check OpenClaw logs." });
        return true;
      }

      const { sock, qr, connection } = session;

      if (url === "/session/qr") {
        if (!qr) {
          json(res, 200, {
            data: { QRCode: "" },
            message: "No QR code available (maybe already connected?)",
          });
        } else {
          json(res, 200, { data: { QRCode: qr } });
        }
        return true;
      }

      if (url === "/session/status") {
        const isConnected = connection === "open";
        // Wuzapi statuses: "CONNECTED", "scancode", "starting"
        let wuzapiStatus = "starting";
        if (isConnected) {
          wuzapiStatus = "CONNECTED";
        } else if (qr) {
          wuzapiStatus = "scancode";
        }

        json(res, 200, {
          status: wuzapiStatus,
          id: "default",
        });
        return true;
      }

      if (url === "/session/pairphone" && req.method === "POST") {
        // Pairing code logic
        // We need to parse body to get phone number
        const buffers = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        const body = Buffer.concat(buffers).toString();
        let phone = "";
        try {
          const parsed = JSON.parse(body);
          phone = parsed.phone?.replace(/\D/g, "") || "";
        } catch (e) {
          /* ignore */
        }

        if (!phone) {
          json(res, 400, { error: "Missing phone number" });
          return true;
        }

        try {
          const code = await sock.requestPairingCode(phone);
          json(res, 200, { LinkingCode: code });
        } catch (e) {
          json(res, 500, { error: String(e) });
        }
        return true;
      }

      // Default 404 for unknown session routes
      json(res, 404, { error: "Not Found" });
      return true;
    }
    return false;
  };
}
