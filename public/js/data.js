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

let visibilityTimeout;

document.addEventListener("visibilitychange", () => {
    clearTimeout(visibilityTimeout);

    if (!document.hidden) {
        visibilityTimeout = setTimeout(() => {
            fetchData();
        }, 300); // Wait 300ms before asserting user is active again to avoid rapid fetches when switching tabs quickly
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
            symbols,
            priceType: getState().PRICE_TYPE
        })
    });

    if (response.redirected && response.url.includes('/login')) {
        window.location.reload();
        return null;
    }

    if (response.status === 401) {
        window.location.reload();
        return null;
    }

    if (!response.ok) {
        const message = `API Error (${response.status})`;
        throw new Error(message);
    }

    return response.json();
}
