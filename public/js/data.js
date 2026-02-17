import { WORKER_URL, state } from './config.js';
import { getAppropriateDecimals, formatPrice, formatNumber } from './utils.js';
import { getSymbolsToFetch } from './market.js';

const COLOR_CLASSES = {
    positive: 'text-[#4ade80]',
    negative: 'text-[#f87171]',
    neutral: 'text-gray-300',
    muted: 'text-gray-500'
};

const ALL_COLOR_CLASSES = Object.values(COLOR_CLASSES);

export function startRefreshInterval() {
    if (state.refreshInterval) {
        clearInterval(state.refreshInterval);
    }
    state.refreshInterval = setInterval(fetchData, state.REFRESH_RATE);
}

export async function fetchData() {
    updateEmptyHint();

    if (state.symbolList.length === 0) return;
    if (state.isFetching) return;

    state.isFetching = true;

    try {
        const uncachedSymbols = state.symbolList.filter(s => !state.assetTypeCache[s]);

        if (uncachedSymbols.length > 0) {
            await fetchAssetTypes(uncachedSymbols);
        }

        const symbolAssetMap = {};
        for (const symbol of state.symbolList) {
            symbolAssetMap[symbol] = state.assetTypeCache[symbol] || 'EQUITY'; // Default to EQUITY
        }

        const symbolsToFetch = getSymbolsToFetch(symbolAssetMap);

        if (symbolsToFetch.length === 0) {
            console.debug("No markets open for current symbols, skipping fetch");
            return;
        }

        console.debug(`Fetching ${symbolsToFetch.length}/${state.symbolList.length} symbols`);

        const symbolsParam = symbolsToFetch.map(s => encodeURIComponent(s)).join(',');
        const response = await fetch(`${WORKER_URL}/quote?symbols=${symbolsParam}&fields=quote`);

        if (response.redirected && response.url.includes('/login')) {
            window.location.reload();
            return;
        }

        if (!response.ok) throw new Error('API Error');

        const data = await response.json();

        updateAssetTypeCache(data);
        updateUI(data);

    } catch (error) {
        console.error("Fetch failed:", error);
    } finally {
        state.isFetching = false;
    }
}

async function fetchAssetTypes(symbols) {
    try {
        const symbolsParam = symbols.map(s => encodeURIComponent(s)).join(',');
        const response = await fetch(`${WORKER_URL}/quote?symbols=${symbolsParam}&fields=quote`);

        if (!response.ok) return;

        const data = await response.json();
        updateAssetTypeCache(data);
    } catch (error) {
        console.error("Failed to fetch asset types:", error);
    }
}

function updateAssetTypeCache(data) {
    for (const [symbol, info] of Object.entries(data)) {
        if (info.assetMainType) {
            state.assetTypeCache[symbol] = info.assetMainType;
        }
    }
}

export function updateEmptyHint() {
    const el = document.getElementById('empty-hint');
    if (el) {
        el.classList.toggle('hidden', state.symbolList.length > 0);
    }
}

function updateUI(data) {
    Object.keys(data).forEach(symbol => {
        try {
            const quote = data[symbol].quote;
            if (!quote) return;

            const priceEl = document.getElementById(`price-${symbol}`);
            const chgEl = document.getElementById(`chg-${symbol}`);
            const pctEl = document.getElementById(`pct-${symbol}`);

            if (!priceEl || !chgEl || !pctEl) return;

            const currentPrice = quote.lastPrice || 0;
            const netChange = quote.netChange || 0;
            const netPercentChange = quote.netPercentChange || quote.futurePercentChange || 0;
            const oldPrice = state.previousPrices[symbol];

            handlePriceFlash(priceEl, symbol, currentPrice, oldPrice);
            state.previousPrices[symbol] = currentPrice;

            updatePriceDisplay(priceEl, chgEl, pctEl, currentPrice, netChange, netPercentChange);
            applyColorClasses(priceEl, chgEl, pctEl, netChange);
        } catch (err) {
            console.error(`Error updating symbol ${symbol}:`, err);
        }
    });
}

function handlePriceFlash(priceEl, symbol, currentPrice, oldPrice) {
    if (oldPrice === undefined || currentPrice === oldPrice) return;

    if (state.flashTimeouts[symbol]) {
        clearTimeout(state.flashTimeouts[symbol]);
    }

    priceEl.classList.remove('flash-up', 'flash-down');
    void priceEl.offsetWidth; // Force reflow

    priceEl.classList.add(currentPrice > oldPrice ? 'flash-up' : 'flash-down');

    state.flashTimeouts[symbol] = setTimeout(() => {
        priceEl.classList.remove('flash-up', 'flash-down');
        delete state.flashTimeouts[symbol];
    }, 700);
}

function updatePriceDisplay(priceEl, chgEl, pctEl, currentPrice, netChange, netPercentChange) {
    const pricePrecision = getAppropriateDecimals(currentPrice, state.DECIMAL_PRECISION);
    const sign = (val) => val > 0 ? '+' : '';

    priceEl.innerText = formatPrice(currentPrice, state.DECIMAL_PRECISION);
    chgEl.innerText = sign(netChange) + formatNumber(netChange, pricePrecision);
    pctEl.innerText = sign(netPercentChange) + netPercentChange.toFixed(2) + '%';
}

function applyColorClasses(priceEl, chgEl, pctEl, netChange) {
    const elements = [priceEl, chgEl, pctEl];
    elements.forEach(el => el.classList.remove(...ALL_COLOR_CLASSES));

    if (netChange > 0) {
        elements.forEach(el => el.classList.add(COLOR_CLASSES.positive));
    } else if (netChange < 0) {
        elements.forEach(el => el.classList.add(COLOR_CLASSES.negative));
    } else {
        priceEl.classList.add(COLOR_CLASSES.neutral);
        chgEl.classList.add(COLOR_CLASSES.muted);
        pctEl.classList.add(COLOR_CLASSES.muted);
    }
}
