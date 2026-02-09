interface Env {
    DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
    // 1. Get the authenticated ID passed from _middleware.ts
    const userId = context.data.yubikeyId as string;

    // Safety check: if middleware didn't run or failed, reject
    if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { 
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    // 2. Handle GET (Load Layout)
    if (context.request.method === "GET") {
        try {
            const result = await context.env.DB.prepare(
                "SELECT layout FROM user_layouts WHERE user_id = ?"
            ).bind(userId).first();

            // If no layout found, return empty list []
            const layoutData = result?.layout ? JSON.parse(result.layout as string) : [];
            
            return new Response(JSON.stringify(layoutData), {
                headers: { "Content-Type": "application/json" }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: "DB Error" }), { status: 500 });
        }
    }

    // 3. Handle POST (Save Layout)
    if (context.request.method === "POST") {
        try {
            const layout = await context.request.json();
            const layoutString = JSON.stringify(layout);

            // Upsert (Insert or Replace)
            await context.env.DB.prepare(
                `INSERT INTO user_layouts (user_id, layout, updated_at) 
                 VALUES (?, ?, ?) 
                 ON CONFLICT(user_id) DO UPDATE SET 
                 layout=excluded.layout, 
                 updated_at=excluded.updated_at`
            ).bind(userId, layoutString, Date.now()).run();

            return new Response(JSON.stringify({ success: true }), {
                headers: { "Content-Type": "application/json" }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: "Save Failed" }), { status: 500 });
        }
    }

    return new Response("Method Not Allowed", { status: 405 });
};
