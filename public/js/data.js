import { WORKER_URL, state } from './config.js';
import { getAppropriateDecimals, formatPrice, formatNumber } from './utils.js';

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
    showLoading(true);

    try {
        const symbolsParam = state.symbolList.map(s => encodeURIComponent(s)).join(',');
        const response = await fetch(`${WORKER_URL}/quote?symbol=${symbolsParam}&fields=quote`);

        if (response.redirected && response.url.includes('/login')) {
            window.location.reload();
            return;
        }

        if (!response.ok) throw new Error('API Error');

        const data = await response.json();
        updateUI(data);

    } catch (error) {
        console.error("Fetch failed:", error);
    } finally {
        state.isFetching = false;
        showLoading(false);
    }
}

function showLoading(show) {
    const el = document.getElementById('loading-indicator');
    if (el) {
        el.classList.toggle('hidden', !show);
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

            if (priceEl && chgEl && pctEl) {
                const currentPrice = quote.lastPrice || 0;
                const netChange = quote.netChange || 0;
                const netPercentChange = quote.netPercentChange || quote.futurePercentChange || 0;
                const oldPrice = state.previousPrices[symbol];

                if (oldPrice !== undefined && currentPrice !== oldPrice) {
                    if (state.flashTimeouts[symbol]) {
                        clearTimeout(state.flashTimeouts[symbol]);
                    }

                    priceEl.classList.remove('flash-up', 'flash-down');
                    void priceEl.offsetWidth;

                    if (currentPrice > oldPrice) {
                        priceEl.classList.add('flash-up');
                    } else {
                        priceEl.classList.add('flash-down');
                    }

                    state.flashTimeouts[symbol] = setTimeout(() => {
                        priceEl.classList.remove('flash-up', 'flash-down');
                        delete state.flashTimeouts[symbol];
                    }, 700);
                }

                state.previousPrices[symbol] = currentPrice;

                const pricePrecision = getAppropriateDecimals(currentPrice, state.DECIMAL_PRECISION);

                priceEl.innerText = formatPrice(currentPrice, state.DECIMAL_PRECISION);
                chgEl.innerText = (netChange > 0 ? '+' : '') + formatNumber(netChange, pricePrecision);
                pctEl.innerText = (netPercentChange > 0 ? '+' : '') + netPercentChange.toFixed(2) + '%';

                [priceEl, chgEl, pctEl].forEach(el => {
                    el.classList.remove('text-[#4ade80]', 'text-[#f87171]', 'text-gray-300', 'text-gray-500');
                });

                if (netChange > 0) {
                    [priceEl, chgEl, pctEl].forEach(el => el.classList.add('text-[#4ade80]'));
                } else if (netChange < 0) {
                    [priceEl, chgEl, pctEl].forEach(el => el.classList.add('text-[#f87171]'));
                } else {
                    priceEl.classList.add('text-gray-300');
                    chgEl.classList.add('text-gray-500');
                    pctEl.classList.add('text-gray-500');
                }
            }
        } catch (err) {
            console.error(`Error updating symbol ${symbol}:`, err);
        }
    });
}
