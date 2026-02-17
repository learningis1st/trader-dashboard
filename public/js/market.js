import { ALWAYS_FETCH_TYPES, ASSET_TO_MARKET_MAP } from './config.js';

let marketHoursCache = null;
let cachedDate = null;

function getTodayDateET() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export async function fetchMarketHours() {
    const today = getTodayDateET();

    if (marketHoursCache && cachedDate === today) {
        return marketHoursCache;
    }

    try {
        const response = await fetch("/api/market-hours");

        if (response.redirected && response.url.includes("/login")) {
            window.location.reload();
            return null;
        }

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const result = await response.json();
        marketHoursCache = result.data;
        cachedDate = today;
        return marketHoursCache;
    } catch (error) {
        console.error("Failed to fetch market hours:", error);
        return null;
    }
}

function isTimeInSession(sessionHours, now) {
    if (!sessionHours) return false;

    const allSessions = [
        ...(sessionHours.preMarket || []),
        ...(sessionHours.regularMarket || []),
        ...(sessionHours.postMarket || []),
    ];

    return allSessions.some(session => {
        const start = new Date(session.start).getTime();
        const end = new Date(session.end).getTime();
        return now >= start && now <= end;
    });
}

export function isMarketInSession(marketKey) {
    if (!marketHoursCache || !marketHoursCache[marketKey]) return true; // Default to open

    const now = Date.now();
    const marketData = marketHoursCache[marketKey];

    for (const product of Object.values(marketData)) {
        if (isTimeInSession(product.sessionHours, now)) {
            return true;
        }
    }

    return false;
}

export function getSymbolsToFetch(symbolAssetMap) {
    const symbolsToFetch = [];

    for (const [symbol, assetType] of Object.entries(symbolAssetMap)) {
        // Always fetch FUTURE and FOREX
        if (ALWAYS_FETCH_TYPES.includes(assetType)) {
            symbolsToFetch.push(symbol);
            continue;
        }

        // Check market hours for other types
        const marketKey = ASSET_TO_MARKET_MAP[assetType];
        if (!marketKey || isMarketInSession(marketKey)) {
            symbolsToFetch.push(symbol);
        }
    }

    return symbolsToFetch;
}

export function getMarketHoursCache() {
    return marketHoursCache;
}
