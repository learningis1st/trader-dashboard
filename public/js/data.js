import { state } from './state.js';
import { getAppropriateDecimals, formatPrice, formatNumber } from './utils.js';
import { getSymbolsToFetch } from './market.js';

const COLORS = {
    positive: 'text-[#4ade80]',
    negative: 'text-[#f87171]',
    neutral: 'text-gray-300',
    muted: 'text-gray-500'
};

const ALL_COLORS = Object.values(COLORS);

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
                updateUI(data);
            }
        }

        // For cached symbols, only fetch those with open markets
        const toFetch = getSymbolsToFetch(
            Object.fromEntries(cached.map(s => [s, state.assetTypeCache[s]]))
        );

        if (toFetch.length > 0) {
            const data = await fetchQuote(toFetch);
            if (data) updateUI(data);
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

export function updateEmptyHint() {
    document.getElementById('empty-hint')
        ?.classList.toggle('hidden', state.symbolList.length > 0);
}

function updateUI(data) {
    for (const [symbol, { quote }] of Object.entries(data)) {
        if (!quote) continue;

        const els = {
            price: document.getElementById(`price-${symbol}`),
            chg: document.getElementById(`chg-${symbol}`),
            pct: document.getElementById(`pct-${symbol}`)
        };

        if (!els.price || !els.chg || !els.pct) continue;

        const price = quote.lastPrice || 0;
        const change = quote.netChange || 0;
        const changePct = quote.netPercentChange || quote.futurePercentChange || 0;

        handlePriceFlash(els.price, symbol, price);
        updatePriceDisplay(els, price, change, changePct);
        applyColors(els, change);
    }
}

function handlePriceFlash(el, symbol, newPrice) {
    const oldPrice = state.previousPrices[symbol];
    state.previousPrices[symbol] = newPrice;

    if (oldPrice === undefined || newPrice === oldPrice) return;

    clearTimeout(state.flashTimeouts[symbol]);
    el.classList.remove('flash-up', 'flash-down');
    void el.offsetWidth; // Force reflow

    el.classList.add(newPrice > oldPrice ? 'flash-up' : 'flash-down');

    state.flashTimeouts[symbol] = setTimeout(() => {
        el.classList.remove('flash-up', 'flash-down');
        delete state.flashTimeouts[symbol];
    }, 700);
}

function updatePriceDisplay(els, price, change, changePct) {
    const precision = getAppropriateDecimals(price, state.DECIMAL_PRECISION);
    const sign = v => (v > 0 ? '+' : '');

    els.price.innerText = formatPrice(price, state.DECIMAL_PRECISION);
    els.chg.innerText = sign(change) + formatNumber(change, precision);
    els.pct.innerText = sign(changePct) + changePct.toFixed(2) + '%';
}

function applyColors({ price, chg, pct }, change) {
    [price, chg, pct].forEach(el => el.classList.remove(...ALL_COLORS));

    if (change > 0) {
        [price, chg, pct].forEach(el => el.classList.add(COLORS.positive));
    } else if (change < 0) {
        [price, chg, pct].forEach(el => el.classList.add(COLORS.negative));
    } else {
        price.classList.add(COLORS.neutral);
        chg.classList.add(COLORS.muted);
        pct.classList.add(COLORS.muted);
    }
}
