
import { monitorWebInbox } from "../../../src/web/inbound.js";
import { logVerbose } from "../../../src/globals.js";

// Define the shape of the message we forward to RapidPro
interface RapidProPayload {
    from: string;
    text: string;
    timestamp: number;
    metadata?: any;
}

export async function monitorRapidProInbox(options: Parameters<typeof monitorWebInbox>[0]) {
    const originalOnMessage = options.onMessage;

    // Wrapped onMessage handler
    const wrappedOnMessage = async (msg: any) => {
        // 1. Forward to RapidPro
        const rapidProUrl = process.env.RAPIDPRO_INBOUND_URL;
        if (rapidProUrl) {
            try {
                const payload: RapidProPayload = {
                    from: msg.from,
                    text: msg.body,
                    timestamp: msg.timestamp || Date.now(),
                    metadata: {
                        pushName: msg.pushName,
                        chatType: msg.chatType
                    }
                };

                logVerbose(`Forwarding message from ${msg.from} to RapidPro...`);

                await fetch(rapidProUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

            } catch (err) {
                console.error("Failed to forward message to RapidPro:", err);
                // Transform error to string for compatibility if needed, but logging to console is safe.
            }
        } else {
            if (Math.random() < 0.01) { // Log warning occasionally to avoid spam
                console.warn("RAPIDPRO_INBOUND_URL not set. Skipping forwarding.");
            }
        }

        // 2. Continue with standard OpenClaw processing
        // This ensures the OpenClaw Agent also sees the message (if configured to reply)
        // or simply maintains the session state.
        if (originalOnMessage) {
            await originalOnMessage(msg);
        }
    };

    // Return the native monitor with our wrapped listener
    return monitorWebInbox({
        ...options,
        onMessage: wrappedOnMessage
    });
}
