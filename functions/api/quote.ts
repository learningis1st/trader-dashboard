import { Env } from "../utils/env";
import { jsonResponse } from "../utils/response";

const QUOTE_API = 'https://finance.learningis1.st/quote';
const MARKET_HOURS_API = 'https://finance.learningis1.st/markets?markets=equity,option,bond';

const getTodayET = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

async function isEquityOvernight(env: Env): Promise<boolean> {
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

export const onRequest: PagesFunction<Env> = async (context) => {
    const userId = context.data.yubikeyId as string;
    if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { searchParams } = new URL(context.request.url);
    const symbols = searchParams.get('symbols');
    const priceType = searchParams.get('priceType') || 'mark';

    if (!symbols) return jsonResponse({ error: 'Missing symbols' }, 400);

    const isOvernight = await isEquityOvernight(context.env);

    const url = new URL(QUOTE_API);
    url.searchParams.set('symbols', symbols);
    url.searchParams.set('fields', 'quote,extended,regular');

    try {
        const resp = await fetch(url.toString());
        if (!resp.ok) throw new Error(`API error: ${resp.status}`);

        const rawData = await resp.json();
        const processedData: Record<string, any> = {};

        for (const [symbol, data] of Object.entries(rawData)) {
            if (symbol === 'errors') {
                processedData[symbol] = data;
                continue;
            }

            const typedData = data as any;
            const quote = typedData.quote || {};
            const extended = typedData.extended;
            const regular = typedData.regular;

            let price = 0, change = 0, changePct = 0;

            const useExtended = isOvernight && typedData.assetMainType === 'EQUITY' && extended && regular;

            if (useExtended) {
                price = extended.mark || extended.lastPrice || 0;
                const prevClose = regular.regularMarketLastPrice || price;
                change = price - prevClose;
                changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;
            } else {
                if (priceType === 'lastPrice') {
                    price = quote.lastPrice || 0;
                    change = quote.netChange || 0;
                    changePct = quote.netPercentChange || quote.futurePercentChange || 0;
                } else {
                    price = quote.mark || quote.lastPrice || 0;
                    change = quote.markChange || quote.netChange || 0;
                    changePct = quote.markPercentChange || quote.futurePercentChange || quote.netPercentChange || 0;
                }
            }

            processedData[symbol] = { price, change, changePct };
        }

        return jsonResponse(processedData);
    } catch (error) {
        console.error('Quote proxy error:', error);
        return jsonResponse({ error: 'Failed to fetch quote' }, 500);
    }
};
