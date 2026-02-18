import { Env, jsonResponse } from "../utils/shared";

const QUOTE_API = 'https://finance.learningis1.st/quote';

export const onRequest: PagesFunction<Env> = async (context) => {
    const userId = context.data.yubikeyId as string;
    if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { symbols, fields } = context.request.url
        .split('?')[1]
        ?.split('&')
        .reduce((acc, cur) => {
            const [k, v] = cur.split('=');
            acc[k] = v;
            return acc;
        }, {} as Record<string, string>) || {};

    if (!symbols) return jsonResponse({ error: 'Missing symbols' }, 400);

    const url = `${QUOTE_API}?symbols=${symbols}${fields ? `&fields=${fields}` : ''}`;
    try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`API returned ${resp.status}`);
        const data = await resp.json();
        return jsonResponse(data);
    } catch (error) {
        console.error('Quote proxy error:', error);
        return jsonResponse({ error: 'Failed to fetch quote' }, 500);
    }
};

