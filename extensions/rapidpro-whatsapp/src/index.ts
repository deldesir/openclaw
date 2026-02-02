
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { setWhatsAppRuntime } from "../../../extensions/whatsapp/src/runtime.js";
import { rapidProWhatsAppPlugin } from "./channel.js";

const plugin = {
    id: "rapidpro-whatsapp",
    name: "RapidPro WhatsApp",
    description: "Native WhatsApp integration with RapidPro forwarding",
    configSchema: emptyPluginConfigSchema(),
    register(api: OpenClawPluginApi) {
        // Ensure the shared runtime is initialized with the API's runtime
        setWhatsAppRuntime(api.runtime);

        api.registerChannel({ plugin: rapidProWhatsAppPlugin });
    },
};

export default plugin;
