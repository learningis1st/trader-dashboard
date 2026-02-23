import { Env } from "./env";

const MARKET_HOURS_API = 'https://finance.learningis1.st/markets?markets=equity,option,bond';

const getTodayET = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

export async function isEquityOvernight(env: Env): Promise<boolean> {
    const today = getTodayET();
    let cacheData: any = null;

    try {
        const cached = await env.DB.prepare('SELECT data FROM market_hours WHERE date = ?').bind(today).first<{ data: string }>();
        if (cached?.data) {
            cacheData = JSON.parse(cached.data);
        } else {
            const response = await fetch(MARKET_HOURS_API);
            if (response.ok) {
                cacheData = await response.json();
                await env.DB.prepare('INSERT OR REPLACE INTO market_hours (date, data, created_at) VALUES (?, ?, ?)')
                    .bind(today, JSON.stringify(cacheData), Date.now()).run();
            }
        }
    } catch (e) {
        return false;
    }

    if (!cacheData || !cacheData.equity) return false;

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', hour12: false });
    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value;

    const weekdayStr = getPart('weekday');
    const hour = parseInt(getPart('hour') || '0', 10);

    const days: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const day = days[weekdayStr as string];

    // No extended hours quoted during the weekend gap
    if (day === 6) return false;
    if (day === 5 && hour >= 20) return false;
    if (day === 0 && hour < 20) return false;

    const inSession = Object.values(cacheData.equity).some((product: any) => {
        if (!product.isOpen || !product.sessionHours) return false;
        const nowTime = Date.now();
        const allSessions = [
            ...(product.sessionHours.preMarket || []),
            ...(product.sessionHours.regularMarket || []),
            ...(product.sessionHours.postMarket || [])
        ];
        return allSessions.some(session => {
            const start = new Date(session.start).getTime();
            const end = new Date(session.end).getTime();
            return nowTime >= start && nowTime <= end;
        });
    });

    return !inSession;
}
