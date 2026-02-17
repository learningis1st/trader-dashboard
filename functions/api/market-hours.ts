interface Env {
    DB: D1Database;
}

const MARKET_HOURS_API = "https://finance.learningis1.st/markets?markets=equity,option,bond";

const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });

function getTodayDateET(): string {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const userId = context.data.yubikeyId as string;

    if (!userId) {
        return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const todayET = getTodayDateET();

    try {
        const cached = await context.env.DB.prepare(
            "SELECT data FROM market_hours WHERE date = ?"
        ).bind(todayET).first<{ data: string }>();

        if (cached?.data) {
            return jsonResponse({ date: todayET, data: JSON.parse(cached.data) });
        }

        const response = await fetch(MARKET_HOURS_API);
        if (!response.ok) {
            throw new Error(`Market hours API returned ${response.status}`);
        }

        const marketData = await response.json();

        await context.env.DB.prepare("DELETE FROM market_hours WHERE date != ?")
            .bind(todayET).run();

        await context.env.DB.prepare(
            "INSERT OR REPLACE INTO market_hours (date, data, created_at) VALUES (?, ?, ?)"
        ).bind(todayET, JSON.stringify(marketData), Date.now()).run();

        return jsonResponse({ date: todayET, data: marketData });
    } catch (error) {
        console.error("Market hours error:", error);
        return jsonResponse({ date: todayET, data: null, error: "Failed to fetch" }, 500);
    }
};
