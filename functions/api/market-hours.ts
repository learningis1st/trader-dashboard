import { Env } from "../utils/env";
import { jsonResponse } from "../utils/response";
import { fetchMarketSchedule, getTodayET } from "../utils/market-schedule";

export const onRequest: PagesFunction<Env> = async (context) => {
    const userId = context.data.yubikeyId as string;
    if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

    try {
        const result = await fetchMarketSchedule(context.env);
        return jsonResponse(result);
    } catch (error) {
        console.error('Market hours error:', error);
        return jsonResponse({ date: getTodayET(), data: null, error: 'Failed to fetch' }, 500);
    }
};
