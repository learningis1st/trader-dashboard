import {
    getState,
    setRefreshInterval,
    setIsFetching,
    setLastQuotes
} from './store/state.js';

export function startRefreshInterval() {
    clearInterval(getState().refreshInterval);
    setRefreshInterval(setInterval(() => {
        // Only fetch if the tab is actively visible
        if (!document.hidden) {
            fetchData();
        }
    }, getState().REFRESH_RATE));
}

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        fetchData();
    }
});

export async function fetchData() {
    window.dispatchEvent(new CustomEvent('update-empty-hint'));

    if (getState().symbolList.length === 0 || getState().isFetching) return;

    setIsFetching(true);

    try {
        const data = await fetchQuote(getState().symbolList);

        if (data) {
            if (data.errors && data.errors.invalidSymbols) {
                window.dispatchEvent(new CustomEvent('quotes-error', {
                    detail: data.errors.invalidSymbols
                }));
                delete data.errors;
            }

            setLastQuotes(data);

            window.dispatchEvent(new CustomEvent('quotes-updated', { detail: data }));
        }
    } catch (error) {
        console.error('Fetch failed:', error);
    } finally {
        setIsFetching(false);
    }
}

export function updateUIFromCache() {
    if (Object.keys(getState().lastQuotes).length > 0) {
        window.dispatchEvent(new CustomEvent('quotes-updated', { detail: getState().lastQuotes }));
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
            priceType: getState().PRICE_TYPE
        })
    });

    if (response.redirected && response.url.includes('/login')) {
        window.location.reload();
        return null;
    }

    if (!response.ok) throw new Error('API Error');
    return response.json();
}
