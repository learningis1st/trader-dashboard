import { state } from './state.js';
import { getSymbolsToFetch, isEquityOvernight } from './market.js';
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
                if (data.errors && data.errors.invalidSymbols) {
                    data.errors.invalidSymbols.forEach(sym => {
                        state.assetTypeCache[sym] = 'INVALID';

                        const priceEl = document.getElementById(`price-${sym}`);
                        const chgEl = document.getElementById(`chg-${sym}`);
                        const pctEl = document.getElementById(`pct-${sym}`);

                        if (priceEl) {
                            priceEl.innerText = 'ERR';
                            priceEl.classList.remove('text-gray-300', 'text-[#4ade80]', 'text-[#f87171]');
                            priceEl.classList.add('text-[#fbbf24]'); // Amber for errors
                        }
                        if (chgEl) chgEl.innerText = 'INVALID';
                        if (pctEl) pctEl.innerText = 'SYMBOL';
                    });
                    delete data.errors;
                }

                cacheAssetTypes(data);
                Object.assign(state.lastQuotes, data);
                renderQuotes(processQuotes(data));
            }
        }

        // For cached symbols, only fetch those with open markets
        const toFetch = getSymbolsToFetch(
            Object.fromEntries(cached.map(s => [s, state.assetTypeCache[s]]))
        );

        if (toFetch.length > 0) {
            const data = await fetchQuote(toFetch);
            if (data) {
                Object.assign(state.lastQuotes, data);
                renderQuotes(processQuotes(data));
            }
        }
    } catch (error) {
        console.error('Fetch failed:', error);
    } finally {
        state.isFetching = false;
    }
}

function processQuotes(data) {
    const overnight = isEquityOvernight();
    const processed = {};

    for (const [symbol, info] of Object.entries(data)) {
        let price, change, changePct;

        // Calculate overnight extended prices manually
        if (overnight && info.assetMainType === 'EQUITY' && info.extended && info.regular) {
            price = info.extended.mark || info.extended.lastPrice || 0;
            const prevClose = info.regular.regularMarketLastPrice || price;

            change = price - prevClose;
            changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;
        } else {
            const quote = info.quote || {};
            if (!quote.lastPrice && !quote.mark) continue;

            if (state.PRICE_TYPE === 'mark') {
                price = quote.mark || quote.lastPrice || 0;
                change = quote.markChange || quote.netChange || 0;
                changePct = quote.markPercentChange || quote.futurePercentChange || quote.netPercentChange || 0;
            } else {
                price = quote.lastPrice || 0;
                change = quote.netChange || 0;
                changePct = quote.netPercentChange || quote.futurePercentChange || 0;
            }
        }

        processed[symbol] = { price, change, changePct };
    }

    return processed;
}

export function updateUIFromCache() {
    if (Object.keys(state.lastQuotes).length > 0) {
        renderQuotes(processQuotes(state.lastQuotes));
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
    const response = await fetch(`/api/quote?symbols=${params}&fields=quote,extended,regular`);

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
