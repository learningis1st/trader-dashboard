import { state } from './state.js';

export function startRefreshInterval() {
    clearInterval(state.refreshInterval);
    state.refreshInterval = setInterval(fetchData, state.REFRESH_RATE);
}

export async function fetchData() {
    window.dispatchEvent(new CustomEvent('update-empty-hint'));

    if (state.symbolList.length === 0 || state.isFetching) return;

    state.isFetching = true;

    try {
        const data = await fetchQuote(state.symbolList);

        if (data) {
            if (data.errors && data.errors.invalidSymbols) {
                data.errors.invalidSymbols.forEach(sym => {
                    const priceEl = document.getElementById(`price-${sym}`);
                    const chgEl = document.getElementById(`chg-${sym}`);
                    const pctEl = document.getElementById(`pct-${sym}`);

                    if (priceEl) {
                        priceEl.innerText = 'ERR';
                        priceEl.classList.remove('text-gray-300', 'text-[#4ade80]', 'text-[#f87171]');
                        priceEl.classList.add('text-[#fbbf24]');
                    }
                    if (chgEl) chgEl.innerText = 'INVALID';
                    if (pctEl) pctEl.innerText = 'SYMBOL';
                });
                delete data.errors;
            }

            Object.assign(state.lastQuotes, data);

            // Dispatch event instead of calling UI directly
            window.dispatchEvent(new CustomEvent('quotes-updated', { detail: data }));
        }
    } catch (error) {
        console.error('Fetch failed:', error);
    } finally {
        state.isFetching = false;
    }
}

export function updateUIFromCache() {
    if (Object.keys(state.lastQuotes).length > 0) {
        window.dispatchEvent(new CustomEvent('quotes-updated', { detail: state.lastQuotes }));
    }
}

async function fetchQuote(symbols) {
    const response = await fetch(`/api/quote`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            symbols: symbols,
            priceType: state.PRICE_TYPE
        })
    });

    if (response.redirected && response.url.includes('/login')) {
        window.location.reload();
        return null;
    }

    if (!response.ok) throw new Error('API Error');
    return response.json();
}
