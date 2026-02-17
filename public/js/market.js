import { ALWAYS_FETCH_TYPES, ASSET_TO_MARKET_MAP } from './config.js';

let cache = null;

export async function fetchMarketHours() {
    if (cache) return cache;

    try {
        const response = await fetch('/api/market-hours');

        if (response.redirected && response.url.includes('/login')) {
            window.location.reload();
            return null;
        }

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const result = await response.json();
        cache = result.data;
        return cache;
    } catch (error) {
        console.error('Failed to fetch market hours:', error);
        return null;
    }
}

function isWithinSessionHours(sessionHours) {
    if (!sessionHours) return false;
    const now = Date.now();
    const allSessions = [
        ...(sessionHours.preMarket || []),
        ...(sessionHours.regularMarket || []),
        ...(sessionHours.postMarket || [])
    ];
    return allSessions.some(session => {
        const start = new Date(session.start).getTime();
        const end = new Date(session.end).getTime();
        return now >= start && now <= end;
    });
}

function isMarketOpen(marketKey) {
    if (!cache?.[marketKey]) return true;
    return Object.values(cache[marketKey]).some(product =>
        product.isOpen || isWithinSessionHours(product.sessionHours)
    );
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
    return cache;
}
