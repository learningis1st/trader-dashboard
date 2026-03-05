import { Env } from "../utils/env";
import { jsonResponse } from "../utils/response";

const MAX_LAYOUT_SIZE = 32 * 1024; // 32KB
const MAX_WIDGETS = 100;
const SYMBOL_PATTERN = /^\/?[A-Z0-9][A-Z0-9._-]{0,14}$/;

type LayoutItem = {
    symbol: string;
    x: number;
    y: number;
    w: number;
    h: number;
};

function isValidLayout(data: unknown): data is LayoutItem[] {
    if (!Array.isArray(data) || data.length > MAX_WIDGETS) return false;

    return data.every((item) => {
        if (!item || typeof item !== "object") return false;

        const entry = item as Record<string, unknown>;
        if (typeof entry.symbol !== "string") return false;
        if (!SYMBOL_PATTERN.test(entry.symbol.trim().toUpperCase())) return false;

        return ["x", "y", "w", "h"].every((key) => {
            const value = entry[key];
            return typeof value === "number" && Number.isFinite(value);
        });
    });
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const userId = context.data.yubikeyId as string;
    if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

    const { method } = context.request;

    if (method === "GET") {
        try {
            const result = await context.env.DB.prepare(
                "SELECT layout FROM user_layouts WHERE user_id = ?"
            ).bind(userId).first<{ layout: string }>();

            if (result?.layout) {
                return new Response(result.layout, {
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                });
            }
            return jsonResponse([]);
        } catch {
            return jsonResponse({ error: "Failed to load layout" }, 500);
        }
    }

    if (method === "POST") {
        const bodyText = await context.request.text();

        if (bodyText.length > MAX_LAYOUT_SIZE) {
            return jsonResponse({ error: "Payload too large" }, 413);
        }

        let parsedBody: unknown;
        try {
            parsedBody = JSON.parse(bodyText);
        } catch {
            return jsonResponse({ error: "Invalid JSON" }, 400);
        }

        if (!isValidLayout(parsedBody)) {
            return jsonResponse({ error: "Invalid layout format" }, 400);
        }

        try {
            await context.env.DB.prepare(
                `INSERT INTO user_layouts (user_id, layout, updated_at)
                 VALUES (?, ?, ?)
                 ON CONFLICT(user_id) DO UPDATE SET
                 layout = excluded.layout,
                 updated_at = excluded.updated_at`
            ).bind(userId, JSON.stringify(parsedBody), Date.now()).run();

            return jsonResponse({ success: true });
        } catch {
            return jsonResponse({ error: "Failed to save layout" }, 500);
        }
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
};
