let cache = null;

export const ASSET_TO_MARKET_MAP = {
    EQUITY: 'equity',
    OPTION: 'option',
    BOND: 'bond',
    FUTURE: 'future',
    FOREX: 'forex'
};

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

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        weekday: 'short',
        hour: 'numeric',
        hour12: false
    });

    const parts = formatter.formatToParts(now);
    const getPart = (type) => parts.find(p => p.type === type)?.value;

    const weekdayStr = getPart('weekday');
    const hourStr = getPart('hour');

    const hour = parseInt(hourStr, 10);
    const days = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const day = days[weekdayStr];

    if (day === 6) return true; // Saturday
    if (day === 5 && hour >= 17) return true; // Friday after 5pm ET
    if (day === 0 && hour < 18) return true;  // Sunday before 6pm ET
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