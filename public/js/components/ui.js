import { state } from '../store/state.js';
import { getAppropriateDecimals, formatPrice, formatNumber } from '../utils.js';

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

const domCache = new Map();

window.addEventListener('widget-removed', (e) => domCache.delete(e.detail.symbol));

function applyColors(els, change) {
    let newColorMode = change > 0 ? 'positive' : (change < 0 ? 'negative' : 'neutral');

    if (els.colorMode === newColorMode) return;

    [els.price, els.chg, els.pct].forEach(el => el.classList.remove(...ALL_COLORS));

    if (newColorMode === 'positive') {
        [els.price, els.chg, els.pct].forEach(el => el.classList.add(COLORS.positive));
    } else if (newColorMode === 'negative') {
        [els.price, els.chg, els.pct].forEach(el => el.classList.add(COLORS.negative));
    } else {
        els.price.classList.add(COLORS.neutral);
        els.chg.classList.add(COLORS.muted);
        els.pct.classList.add(COLORS.muted);
    }

    els.colorMode = newColorMode;
}

export function renderQuotes(processedData) {
    for (const [symbol, info] of Object.entries(processedData)) {
        let els = domCache.get(symbol);

        if (!els) {
            els = {
                price: document.getElementById(`price-${symbol}`),
                chg: document.getElementById(`chg-${symbol}`),
                pct: document.getElementById(`pct-${symbol}`),
                colorMode: null
            };
            if (!els.price || !els.chg || !els.pct) continue;
            domCache.set(symbol, els);
        }

        const [ price, change, changePct ] = info;

        handlePriceFlash(els.price, symbol, price);
        updatePriceDisplay(els, price, change, changePct);
        applyColors(els, change);
    }
}

export function handleInvalidSymbols(invalidSymbols) {
    invalidSymbols.forEach(sym => {
        const priceEl = document.getElementById(`price-${sym}`);
        const chgEl = document.getElementById(`chg-${sym}`);
        const pctEl = document.getElementById(`pct-${sym}`);

        if (priceEl) {
            priceEl.innerText = '---';
            priceEl.classList.remove(...ALL_COLORS, 'text-[#fbbf24]');
            priceEl.classList.add(COLORS.neutral);
        }
        if (chgEl) chgEl.innerText = '--';
        if (pctEl) pctEl.innerText = '--%';
    });
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

export function createTickerInput(oldSymbol, el, onComplete) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = oldSymbol;
    input.name = 'ticker-edit-input'; 
    input.id = `edit-${oldSymbol}`;
    input.className = 'bg-gray-700 text-white responsive-symbol font-bold w-[50cqmin] px-1 rounded border border-blue-500 uppercase focus:outline-none';

    const parent = el.parentNode;

    const finish = () => {
        const newSymbol = input.value.trim().toUpperCase();
        const success = onComplete(newSymbol);

        if (!success) {
            parent.replaceChild(el, input);
        }
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            input.value = oldSymbol;
            input.blur();
        }
    });

    parent.replaceChild(input, el);
    input.focus();
    input.select();
}

window.addEventListener('quotes-updated', (e) => renderQuotes(e.detail));
window.addEventListener('quotes-error', (e) => handleInvalidSymbols(e.detail));
window.addEventListener('update-empty-hint', () => updateEmptyHint());
