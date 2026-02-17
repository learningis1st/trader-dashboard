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

export function isAnyMarketInSession(marketData) {
    if (!marketData) return true; // Default to open if no data

    const now = Date.now();

    for (const marketType of Object.values(marketData)) {
        for (const product of Object.values(marketType)) {
            if (isTimeInSession(product.sessionHours, now)) {
                return true;
            }
        }
    }

    return false;
}

export async function shouldFetchData() {
    const today = getTodayDateET();

    if (cachedDate !== today) {
        await fetchMarketHours();
    }

    return isAnyMarketInSession(marketHoursCache);
}

