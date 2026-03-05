import { Env } from "../utils/env";
import { jsonResponse } from "../utils/response";
import { getMarketStatus } from "../utils/market-hours";
import { calculateDisplayQuote } from "../utils/pricing";

const QUOTE_API = "https://finance.learningis1.st/quote";
const MAX_SYMBOLS = 100;
const SYMBOL_PATTERN = /^\/?[A-Z0-9][A-Z0-9._-]{0,14}$/;

function normalizeSymbols(symbols: unknown): string[] {
    if (!Array.isArray(symbols)) return [];

    const unique = new Set<string>();
    for (const raw of symbols) {
        if (typeof raw !== "string") continue;

        const symbol = raw.trim().toUpperCase();
        if (!SYMBOL_PATTERN.test(symbol)) continue;

        unique.add(symbol);
        if (unique.size >= MAX_SYMBOLS) break;
    }

    return Array.from(unique);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const userId = context.data.yubikeyId as string;
    if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

    let body: unknown;
    try {
        body = await context.request.json();
    } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return jsonResponse({ error: "Invalid request payload" }, 400);
    }

    const payload = body as { symbols?: unknown; priceType?: unknown };
    const symbolsArray = normalizeSymbols(payload.symbols);
    if (symbolsArray.length === 0) {
        return jsonResponse({ error: "Missing or invalid symbols" }, 400);
    }

    const priceType = payload.priceType === "lastPrice" ? "lastPrice" : "mark";

    const marketStatus = await getMarketStatus(context.env);

    const url = new URL(QUOTE_API);
    url.searchParams.set("symbols", symbolsArray.join(","));

    const fields = marketStatus.EQUITY_OVERNIGHT ? "quote,extended,regular" : "quote";
    url.searchParams.set("fields", fields);

    try {
        const resp = await context.env.SCHWAB_WORKER.fetch(url.toString());
        if (!resp.ok) throw new Error(`API error: ${resp.status}`);

        const rawData = await resp.json();
        const processedData: Record<string, unknown> = {};

        for (const [symbol, data] of Object.entries(rawData)) {
            if (symbol === "errors") {
                processedData[symbol] = data;
                continue;
            }

            const typedData = data as any;
            const isOvernight = typedData.assetMainType === "EQUITY" ? !!marketStatus.EQUITY_OVERNIGHT : false;

            processedData[symbol] = calculateDisplayQuote(typedData, priceType, isOvernight);
        }

        return jsonResponse(processedData);
    } catch {
        return jsonResponse({ error: "Failed to fetch quote" }, 500);
    }
};
