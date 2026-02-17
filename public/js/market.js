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

function isMarketInSession(marketKey) {
    if (!marketHoursCache?.[marketKey]) return true;

    const now = Date.now();
    return Object.values(marketHoursCache[marketKey])
        .some(product => isTimeInSession(product.sessionHours, now));
}

export function getSymbolsToFetch(symbolAssetMap) {
    return Object.entries(symbolAssetMap)
        .filter(([, assetType]) => {
            if (ALWAYS_FETCH_TYPES.includes(assetType)) return true;
            const marketKey = ASSET_TO_MARKET_MAP[assetType];
            return !marketKey || isMarketInSession(marketKey);
        })
        .map(([symbol]) => symbol);
}

export function getMarketHoursCache() {
    return marketHoursCache;
}
