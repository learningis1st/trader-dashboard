import { ASSET_TO_MARKET_MAP } from './config.js';

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

function isWeekendGap() {
    const now = new Date();
    // Get hour in New York
    const nyTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const day = nyTime.getDay(); // 0-6 relative to local time
    const hour = nyTime.getHours();

    if (day === 6) return true; // Saturday
    if (day === 5 && hour >= 17) return true; // Friday after 5pm ET
    if (day === 0 && hour < 17) return true;  // Sunday before 5pm ET
    return false;
}

export function getSymbolsToFetch(symbolAssetMap) {
    return Object.entries(symbolAssetMap)
        .filter(([, assetType]) => {
            const marketKey = ASSET_TO_MARKET_MAP[assetType];

            // Equity: Only check isOpen (24/5 trading)
            if (marketKey === 'equity') {
                if (!cache?.[marketKey]) return false;
                return Object.values(cache[marketKey]).some(product =>
                    product.isOpen
                );
            }

            // Strict Session Checks: Option, Bond
            // Must be explicitly Open AND within an active session
            if (['option', 'bond'].includes(marketKey)) {
                if (!cache?.[marketKey]) return false;
                return Object.values(cache[marketKey]).some(product =>
                    product.isOpen && isWithinSessionHours(product.sessionHours)
                );
            }

            // Continuous Trading: Future, Forex
            // Fetch always, except during the weekend gap
            return !isWeekendGap();
        })
        .map(([symbol]) => symbol);
}

export function getMarketHoursCache() {
    return cache;
}