
import { whatsappPlugin } from "../../../extensions/whatsapp/src/channel.js";
import { monitorWebChannel } from "../../../src/web/auto-reply/monitor.js";
import { monitorRapidProInbox } from "./monitor-wrapper.js";
import { getWhatsAppRuntime } from "../../../extensions/whatsapp/src/runtime.js";

// Create the custom plugin by extending the base WhatsApp plugin
export const rapidProWhatsAppPlugin = {
    ...whatsappPlugin,
    id: "rapidpro-whatsapp",
    name: "RapidPro WhatsApp",
    description: "Native WhatsApp integration with RapidPro forwarding",

    // Override the gateway capability to use our custom monitor
    gateway: {
        ...whatsappPlugin.gateway,

        startAccount: async (ctx: any) => {
            const runtime = getWhatsAppRuntime();
            // We call the standard monitorWebChannel but pass our custom listener factory
            // verify signature of monitorWebChannel:
            // (verbose, listenerFactory, keepAlive, replyResolver, runtime, abortSignal, tuning)

            return monitorWebChannel(
                ctx.verbose,
                monitorRapidProInbox, // <--- INJECTED CUSTOM LISTENER
                true, // keepAlive
                undefined, // use default replyResolver
                runtime,
                ctx.abortSignal,
                ctx.tuning
            );
        }
    }
};
