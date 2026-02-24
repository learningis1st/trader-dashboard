import { Env } from "../utils/env";
import { jsonResponse } from "../utils/response";
import { getMarketStatus } from "../utils/market-hours";
import { calculateDisplayQuote } from "../utils/pricing";

const QUOTE_API = 'https://finance.learningis1.st/quote';

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

    const marketStatus = await getMarketStatus(context.env);

    const url = new URL(QUOTE_API);
    url.searchParams.set('symbols', symbolsArray.join(','));

    const fields = marketStatus['EQUITY_OVERNIGHT'] ? 'quote,extended,regular' : 'quote';
    url.searchParams.set('fields', fields);

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

            const isOvernight = typedData.assetMainType === 'EQUITY'
                ? (marketStatus['EQUITY_OVERNIGHT'] || false)
                : false;

            processedData[symbol] = calculateDisplayQuote(typedData, priceType, isOvernight);
        }

        return jsonResponse(processedData);
    } catch (error) {
        return jsonResponse({ error: 'Failed to fetch quote' }, 500);
    }
};
