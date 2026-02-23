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
                window.dispatchEvent(new CustomEvent('quotes-error', {
                    detail: data.errors.invalidSymbols
                }));
                delete data.errors;
            }

            Object.assign(state.lastQuotes, data);

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
