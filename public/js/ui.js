import { state } from './state.js';
import { getAppropriateDecimals, formatPrice, formatNumber } from './utils.js';
import { isEquityOvernight } from './market.js';

const COLORS = {
    positive: 'text-[#4ade80]',
    negative: 'text-[#f87171]',
    neutral: 'text-gray-300',
    muted: 'text-gray-500'
};

const ALL_COLORS = Object.values(COLORS);

export function updateEmptyHint() {
    document.getElementById('empty-hint')
        ?.classList.toggle('hidden', state.symbolList.length > 0);
}

export function reRenderUI() {
    if (Object.keys(state.lastQuotes).length > 0) {
        renderQuotes(state.lastQuotes);
    }
}

export function renderQuotes(data) {
    const overnight = isEquityOvernight();

    for (const [symbol, info] of Object.entries(data)) {
        state.lastQuotes[symbol] = info;

        const els = {
            price: document.getElementById(`price-${symbol}`),
            chg: document.getElementById(`chg-${symbol}`),
            pct: document.getElementById(`pct-${symbol}`)
        };

        if (!els.price || !els.chg || !els.pct) continue;

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
    const className = newPrice > oldPrice ? 'flash-up' : 'flash-down';
    requestAnimationFrame(() => {
        el.classList.add(className);
    });

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
