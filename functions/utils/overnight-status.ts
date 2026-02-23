import { Env } from "./env";
import { fetchMarketSchedule } from "./market-schedule";

export function evaluateOvernightStatus(cacheData: any, targetDate: Date = new Date()): Record<string, boolean> {
    const status: Record<string, boolean> = { EQUITY: false, OPTION: false, BOND: false };
    if (!cacheData) return status;

    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', hour12: false });
    const parts = formatter.formatToParts(targetDate);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value;

    const weekdayStr = getPart('weekday');
    const hour = parseInt(getPart('hour') || '0', 10);
    const days: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const day = days[weekdayStr as string];

    // Weekend Gap Check
    if (day === 6 || (day === 5 && hour >= 20) || (day === 0 && hour < 20)) return status;

    const checkMarket = (marketKey: string) => {
        if (!cacheData[marketKey]) return false;
        const nowTime = targetDate.getTime();

        const inSession = Object.values(cacheData[marketKey]).some((product: any) => {
            if (!product.isOpen || !product.sessionHours) return false;
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
    };

    status.EQUITY = checkMarket('equity');
    status.OPTION = checkMarket('option');
    status.BOND = checkMarket('bond');

    return status;
}

export async function getOvernightStatus(env: Env): Promise<Record<string, boolean>> {
    try {
        // Use the centralized fetching logic
        const scheduleResult = await fetchMarketSchedule(env);
        return evaluateOvernightStatus(scheduleResult.data);
    } catch (e) {
        return { EQUITY: false, OPTION: false, BOND: false };
    }
}
