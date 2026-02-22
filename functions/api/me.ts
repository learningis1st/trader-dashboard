import { Env } from "../utils/env";
import { jsonResponse } from "../utils/response";

export const onRequest: PagesFunction<Env> = async (context) => {
    const userId = context.data.yubikeyId as string;
    if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

    try {
        const result = await context.env.DB.prepare(
            "SELECT is_paying FROM yubikeys WHERE yubikey_id = ?"
        ).bind(userId).first<{ is_paying: number }>();

        return jsonResponse({
            yubikey_id: userId,
            is_paying: !!result?.is_paying
        });
    } catch {
        return jsonResponse({ error: "Failed to fetch user profile" }, 500);
    }
};
