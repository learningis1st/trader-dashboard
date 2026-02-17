import { ALWAYS_FETCH_TYPES, ASSET_TO_MARKET_MAP } from './config.js';

let marketHoursCache = null;

export async function fetchMarketHours() {
    if (marketHoursCache) {
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
        return marketHoursCache;
    } catch (error) {
        console.error("Failed to fetch market hours:", error);
        return null;
    }
}

function isMarketOpen(marketKey) {
    if (!marketHoursCache?.[marketKey]) {
        return true;
    }

    return Object.values(marketHoursCache[marketKey]).some(product => product.isOpen);
}

export function getSymbolsToFetch(symbolAssetMap) {
    return Object.entries(symbolAssetMap)
        .filter(([, assetType]) => {
            if (ALWAYS_FETCH_TYPES.includes(assetType)) return true;
            const marketKey = ASSET_TO_MARKET_MAP[assetType];
            return !marketKey || isMarketOpen(marketKey);
        })
        .map(([symbol]) => symbol);
}

export function getMarketHoursCache() {
    return marketHoursCache;
}
