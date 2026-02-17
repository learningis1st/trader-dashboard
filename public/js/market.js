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
        console.log("[Market Hours] Loaded:", marketHoursCache);
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

    for (const session of allSessions) {
        const start = new Date(session.start).getTime();
        const end = new Date(session.end).getTime();

        if (now >= start && now <= end) {
            console.log(`[Session] In session: ${session.start} to ${session.end}`);
            return true;
        }
    }

    return false;
}

function isMarketInSession(marketKey) {
    if (!marketHoursCache?.[marketKey]) {
        console.log(`[Market] No data for ${marketKey}, assuming open`);
        return true;
    }

    const now = Date.now();
    const marketData = marketHoursCache[marketKey];

    console.log(`[Market] Checking ${marketKey} at ${new Date(now).toISOString()}`);

    for (const [product, productData] of Object.entries(marketData)) {
        console.log(`[Market] Product ${product}, isOpen: ${productData.isOpen}`);
        if (isTimeInSession(productData.sessionHours, now)) {
            return true;
        }
    }

    console.log(`[Market] ${marketKey} is CLOSED`);
    return false;
}

export function getSymbolsToFetch(symbolAssetMap) {
    return Object.entries(symbolAssetMap)
        .filter(([symbol, assetType]) => {
            if (ALWAYS_FETCH_TYPES.includes(assetType)) {
                console.log(`[Filter] ${symbol} (${assetType}) - always fetch`);
                return true;
            }
            const marketKey = ASSET_TO_MARKET_MAP[assetType];
            if (!marketKey) {
                console.log(`[Filter] ${symbol} (${assetType}) - no market mapping, fetching`);
                return true;
            }
            const inSession = isMarketInSession(marketKey);
            console.log(`[Filter] ${symbol} (${assetType}) -> ${marketKey} = ${inSession}`);
            return inSession;
        })
        .map(([symbol]) => symbol);
}

export function getMarketHoursCache() {
    return marketHoursCache;
}
