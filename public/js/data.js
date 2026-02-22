import { state } from './state.js';
import { getSymbolsToFetch } from './market.js';
import { renderQuotes, updateEmptyHint } from './ui.js';

export function startRefreshInterval() {
    clearInterval(state.refreshInterval);
    state.refreshInterval = setInterval(fetchData, state.REFRESH_RATE);
}

export async function fetchData() {
    updateEmptyHint();

    if (state.symbolList.length === 0 || state.isFetching) return;

    state.isFetching = true;

    try {
        const { uncached, cached } = partitionSymbols();

        // Always fetch uncached symbols to learn their asset types
        if (uncached.length > 0) {
            const data = await fetchQuote(uncached);
            if (data) {
                cacheAssetTypes(data);
                renderQuotes(data);
            }
        }

        // For cached symbols, only fetch those with open markets
        const toFetch = getSymbolsToFetch(
            Object.fromEntries(cached.map(s => [s, state.assetTypeCache[s]]))
        );

        if (toFetch.length > 0) {
            const data = await fetchQuote(toFetch);
            if (data) renderQuotes(data);
        }
    } catch (error) {
        console.error('Fetch failed:', error);
    } finally {
        state.isFetching = false;
    }
}

function partitionSymbols() {
    const uncached = [];
    const cached = [];

    for (const s of state.symbolList) {
        (state.assetTypeCache[s] ? cached : uncached).push(s);
    }

    return { uncached, cached };
}

async function fetchQuote(symbols) {
    const params = symbols.map(encodeURIComponent).join(',');
    const response = await fetch(`/api/quote?symbols=${params}&fields=quote`);

    if (response.redirected && response.url.includes('/login')) {
        window.location.reload();
        return null;
    }

    if (!response.ok) throw new Error('API Error');
    return response.json();
}

function cacheAssetTypes(data) {
    for (const [symbol, info] of Object.entries(data)) {
        if (info.assetMainType) {
            state.assetTypeCache[symbol] = info.assetMainType;
        }
    }
}
