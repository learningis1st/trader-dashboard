import { Env } from "./env";

const MARKET_HOURS_API = 'https://finance.learningis1.st/markets?markets=equity,option,bond';

export const getTodayET = () =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

export async function fetchMarketSchedule(env: Env) {
    const today = getTodayET();

    // Check DB cache first
    const cached = await env.DB
        .prepare('SELECT data FROM market_hours WHERE date = ?')
        .bind(today)
        .first<{ data: string }>();

    if (cached?.data) {
        return { date: today, data: JSON.parse(cached.data) };
    }

    // Fetch from external API if missing
    const response = await fetch(MARKET_HOURS_API);
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const marketData = await response.json();

    // Save back to DB cache
    await env.DB
        .prepare('INSERT OR REPLACE INTO market_hours (date, data, created_at) VALUES (?, ?, ?)')
        .bind(today, JSON.stringify(marketData), Date.now())
        .run();

    return { date: today, data: marketData };
}
