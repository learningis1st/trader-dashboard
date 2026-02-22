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

        // Strip out the heavy unused data
        for (const [symbol, data] of Object.entries(rawData)) {
            const typedData = data as any;
            const quote = typedData.quote || {};

            filteredData[symbol] = {
                assetMainType: typedData.assetMainType,
                quote: {
                    mark: quote.mark,
                    lastPrice: quote.lastPrice,
                    markChange: quote.markChange,
                    netChange: quote.netChange,
                    markPercentChange: quote.markPercentChange,
                    netPercentChange: quote.netPercentChange,
                    futurePercentChange: quote.futurePercentChange
                }
            };
        }

        return jsonResponse(filteredData);
    } catch (error) {
        console.error('Quote proxy error:', error);
        return jsonResponse({ error: 'Failed to fetch quote' }, 500);
    }
};
