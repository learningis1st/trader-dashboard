import { Env } from "../utils/env";
import { jsonResponse } from "../utils/response";

const QUOTE_API = 'https://finance.learningis1.st/quote';

export const onRequest: PagesFunction<Env> = async (context) => {
    const userId = context.data.yubikeyId as string;
    if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { searchParams } = new URL(context.request.url);
    const symbols = searchParams.get('symbols');
    const fields = searchParams.get('fields');

    if (!symbols) return jsonResponse({ error: 'Missing symbols' }, 400);

    const url = new URL(QUOTE_API);
    url.searchParams.set('symbols', symbols);
    if (fields) url.searchParams.set('fields', fields);

    try {
        const resp = await fetch(url.toString());
        if (!resp.ok) throw new Error(`API error: ${resp.status}`);

        const rawData = await resp.json();
        const filteredData: Record<string, any> = {};

        for (const [symbol, data] of Object.entries(rawData)) {
            if (symbol === 'errors') {
                filteredData[symbol] = data;
                continue;
            }

            const typedData = data as any;
            const quote = typedData.quote || {};
            const extended = typedData.extended;
            const regular = typedData.regular;

            const processed: Record<string, any> = {
                assetMainType: typedData.assetMainType,
                regular: {
                    mark: {
                        price: quote.mark || quote.lastPrice || 0,
                        change: quote.markChange || quote.netChange || 0,
                        changePct: quote.markPercentChange || quote.futurePercentChange || quote.netPercentChange || 0
                    },
                    lastPrice: {
                        price: quote.lastPrice || 0,
                        change: quote.netChange || 0,
                        changePct: quote.netPercentChange || quote.futurePercentChange || 0
                    }
                }
            };

            if (extended && regular) {
                const extPrice = extended.mark || extended.lastPrice || 0;
                const prevClose = regular.regularMarketLastPrice || extPrice;
                const extChange = extPrice - prevClose;
                const extChangePct = prevClose !== 0 ? (extChange / prevClose) * 100 : 0;

                processed.extended = {
                    price: extPrice,
                    change: extChange,
                    changePct: extChangePct
                };
            }

            filteredData[symbol] = processed;
        }

        return jsonResponse(filteredData);
    } catch (error) {
        console.error('Quote proxy error:', error);
        return jsonResponse({ error: 'Failed to fetch quote' }, 500);
    }
};
