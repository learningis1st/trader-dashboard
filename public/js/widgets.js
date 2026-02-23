import { state } from './state.js';
import { saveLayout } from './layoutStore.js';
import { escapeHtml } from './utils.js';
import { fetchData } from './data.js';
import { createWidgetHtml } from './widgetTemplate.js';

export function applyLayout(layout) {
    state.isRestoring = true;
    state.grid.batchUpdate();
    state.grid.removeAll();
    state.symbolList = [];

    layout.forEach(item => item.symbol && addSymbolWidget(item.symbol, item));

    state.grid.commit();
    state.isRestoring = false;
}

export function addSymbolWidget(symbol, options = null) {
    if (state.symbolList.includes(symbol)) return;
    state.symbolList.push(symbol);

    const safeSymbol = escapeHtml(symbol);

    state.grid.addWidget({
        ...(options || {
            w: state.DEFAULT_WIDGET_WIDTH,
            h: state.DEFAULT_WIDGET_HEIGHT,
            autoPosition: true
        }),
        content: createWidgetHtml(safeSymbol),
        id: safeSymbol
    });

    saveLayout();
    window.dispatchEvent(new CustomEvent('update-empty-hint'));
}

export function removeSymbol(symbol) {
    const widget = document.getElementById(`widget-${symbol}`)?.closest('.grid-stack-item');
    if (!widget) return;

    state.grid.removeWidget(widget);
    state.symbolList = state.symbolList.filter(s => s !== symbol);
    delete state.previousPrices[symbol];
    delete state.assetTypeCache[symbol];

    saveLayout();
    window.dispatchEvent(new CustomEvent('update-empty-hint'));
}

export function openTradingView(symbol) {
    window.open(`https://www.tradingview.com/chart/?symbol=${symbol}`, '_blank');
}

export function editTicker(oldSymbol, el) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = oldSymbol;
    input.className = 'bg-gray-700 text-white responsive-symbol font-bold w-[50cqmin] px-1 rounded border border-blue-500 uppercase focus:outline-none';

    const parent = el.parentNode;

    const finish = () => {
        const newSymbol = input.value.trim().toUpperCase();

        if (!newSymbol || newSymbol === oldSymbol) {
            parent.replaceChild(el, input);
            return;
        }

        if (state.symbolList.includes(newSymbol)) {
            alert(`Symbol ${newSymbol} is already on the dashboard.`);
            parent.replaceChild(el, input);
            return;
        }

        const widget = document.getElementById(`widget-${oldSymbol}`)?.closest('.grid-stack-item');
        const node = widget?.gridstackNode;

        if (!node) {
            parent.replaceChild(el, input);
            return;
        }

        const position = { x: node.x, y: node.y, w: node.w, h: node.h };

        state.grid.removeWidget(widget);
        state.symbolList = state.symbolList.filter(s => s !== oldSymbol);
        delete state.previousPrices[oldSymbol];
        delete state.assetTypeCache[oldSymbol];

        addSymbolWidget(newSymbol, position);
        fetchData();
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') {
            input.value = oldSymbol;
            input.blur();
        }
    });

    parent.replaceChild(input, el);
    input.focus();
    input.select();
}

window.widgetActions = { removeSymbol, openTradingView, editTicker };
