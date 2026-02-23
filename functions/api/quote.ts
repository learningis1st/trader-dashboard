import { Env } from "../utils/env";
import { jsonResponse } from "../utils/response";
import { isEquityOvernight } from "../utils/market-status"; // <-- import moved function

const QUOTE_API = 'https://finance.learningis1.st/quote';
const MARKET_HOURS_API = 'https://finance.learningis1.st/markets?markets=equity,option,bond';

const cleanFloat = (num: number) => Number(num.toFixed(6));

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const userId = context.data.yubikeyId as string;
    if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

    let body: { symbols?: string[], priceType?: string };
    try {
        body = await context.request.json();
    } catch (e) {
        return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const symbolsArray = body?.symbols;
    const priceType = body?.priceType || 'mark';

    if (!symbolsArray || !Array.isArray(symbolsArray) || symbolsArray.length === 0) {
        return jsonResponse({ error: 'Missing symbols' }, 400);
    }

    const isOvernight = await isEquityOvernight(context.env);

    const url = new URL(QUOTE_API);
    url.searchParams.set('symbols', symbolsArray.join(','));
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

            processedData[symbol] = {
                price: cleanFloat(price),
                change: cleanFloat(change),
                changePct: cleanFloat(changePct)
            };
        }

        return jsonResponse(processedData);
    } catch (error) {
        console.error('Quote proxy error:', error);
        return jsonResponse({ error: 'Failed to fetch quote' }, 500);
    }
};
