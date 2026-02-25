import { Env } from "./env";

const MARKET_HOURS_API = 'https://finance.learningis1.st/markets?markets=option,bond';

export const getTodayET = () =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

export async function fetchMarketSchedule(env: Env) {
    const today = getTodayET();

    const cached = await env.DB
        .prepare('SELECT data FROM market_hours WHERE date = ?')
        .bind(today)
        .first<{ data: string }>();

    if (cached?.data) {
        return { date: today, data: JSON.parse(cached.data) };
    }

    const response = await env.SCHWAB_WORKER.fetch(MARKET_HOURS_API);
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const marketData = await response.json();

    await env.DB
        .prepare('INSERT OR REPLACE INTO market_hours (date, data, created_at) VALUES (?, ?, ?)')
        .bind(today, JSON.stringify(marketData), Date.now())
        .run();

    return { date: today, data: marketData };
}

function isApiMarketOpen(apiData: any, marketKey: string, nowTime: number): boolean {
    if (!apiData || !apiData[marketKey]) return false;

    return Object.values(apiData[marketKey]).some((product: any) => {
        if (!product.isOpen || !product.sessionHours) return false;

        const allSessions = [
            ...(product.sessionHours.preMarket || []),
            ...(product.sessionHours.regularMarket || []),
            ...(product.sessionHours.postMarket || [])
        ];

        return allSessions.some((session: any) => {
            const start = new Date(session.start).getTime();
            const end = new Date(session.end).getTime();
            return nowTime >= start && nowTime <= end;
        });
    });
}

function isEquitiesOpen(day: number, hour: number): boolean {
    // Active quoting (Pre-market + Regular + Post-market) is 4:00 AM to 8:00 PM ET
    // Anything outside this window (8:00 PM to 4:00 AM) is considered the overnight session
    if (day >= 1 && day <= 5) { // Monday through Friday
        if (hour >= 4 && hour < 20) return true;
    }
    return false;
}

function isEquityOvernight(day: number, hour: number): boolean {
    // Active trading hours (Pre + Regular + Post) are Mon-Fri, 4:00 AM to 8:00 PM ET
    if (day >= 1 && day <= 5) {
        if (hour >= 4 && hour < 20) return false;
    }
    return true; // Outside these hours is the overnight session
}

function isFutureOpen(day: number, hour: number): boolean {
    // Trades from Sunday at 6:00 pm ET to Friday at 5:00 pm ET
    if (day >= 1 && day <= 4) return true;
    if (day === 5 && hour < 17) return true; // Fri before 5 PM
    if (day === 0 && hour >= 18) return true; // Sun from 6 PM onwards
    return false;
}

function isForexOpen(day: number, hour: number): boolean {
    // Trades from 5:00 p.m. ET on Sunday and closing at 5:00 p.m. ET on Friday
    if (day >= 1 && day <= 4) return true;
    if (day === 5 && hour < 17) return true; // Fri before 5 PM
    if (day === 0 && hour >= 17) return true; // Sun from 5 PM onwards
    return false;
}

export async function getMarketStatus(env: Env, targetDate: Date = new Date()): Promise<Record<string, boolean>> {
    let apiData = null;
    try {
        const scheduleResult = await fetchMarketSchedule(env);
        apiData = scheduleResult.data;
    } catch (e) {
        console.error('Failed to fetch market schedule:', e);
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        weekday: 'short',
        hour: 'numeric',
        hourCycle: 'h23'
    });

    const parts = formatter.formatToParts(targetDate);
    const dayStr = parts.find(p => p.type === 'weekday')?.value || 'Sun';
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);

    const days: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const day = days[dayStr] ?? 0;
    const nowTime = targetDate.getTime();

    return {
        EQUITY: isEquitiesOpen(day, hour),
        EQUITY_OVERNIGHT: isEquityOvernight(day, hour),
        FUTURE: isFutureOpen(day, hour),
        FOREX: isForexOpen(day, hour),
        OPTION: isApiMarketOpen(apiData, 'option', nowTime),
        BOND: isApiMarketOpen(apiData, 'bond', nowTime)
    };
}
