import { Env } from "../utils/env";
import { jsonResponse } from "../utils/response";

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
        const MAX_LAYOUT_SIZE = 32 * 1024; // 32KB
        const bodyText = await context.request.text();

        if (bodyText.length > MAX_LAYOUT_SIZE) {
            return jsonResponse({ error: "Payload too large" }, 413);
        }

        try {
            JSON.parse(bodyText);

            await context.env.DB.prepare(
                `INSERT INTO user_layouts (user_id, layout, updated_at)
                 VALUES (?, ?, ?)
                 ON CONFLICT(user_id) DO UPDATE SET
                 layout = excluded.layout,
                 updated_at = excluded.updated_at`
            ).bind(userId, bodyText, Date.now()).run();

            return jsonResponse({ success: true });
        } catch {
            return jsonResponse({ error: "Invalid data format" }, 400);
        }
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
};
