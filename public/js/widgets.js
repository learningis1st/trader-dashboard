import {
    getState,
    setIsRestoring,
    setGrid,
    clearSymbolList,
    addSymbol,
    removeSymbol as removeSymbolFromState
} from './state.js';
import { saveLayout } from './layoutStore.js';
import { escapeHtml } from './utils.js';
import { fetchData } from './data.js';
import { createWidgetHtml } from './widgetTemplate.js';

export function applyLayout(layout) {
    setIsRestoring(true);
    getState().grid.batchUpdate();
    getState().grid.removeAll();
    clearSymbolList();

    layout.forEach(item => item.symbol && addSymbolWidget(item.symbol, item));

    getState().grid.commit();
    setIsRestoring(false);
}

export function addSymbolWidget(symbol, options = null) {
    if (getState().symbolList.includes(symbol)) return;
    addSymbol(symbol);

    const safeSymbol = escapeHtml(symbol);

    getState().grid.addWidget({
        ...(options || {
            w: getState().DEFAULT_WIDGET_WIDTH,
            h: getState().DEFAULT_WIDGET_HEIGHT,
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

    getState().grid.removeWidget(widget);
    removeSymbolFromState(symbol);
    delete getState().previousPrices[symbol];
    delete getState().assetTypeCache[symbol];

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

        if (getState().symbolList.includes(newSymbol)) {
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

        getState().grid.removeWidget(widget);
        removeSymbolFromState(oldSymbol);
        delete getState().previousPrices[oldSymbol];
        delete getState().assetTypeCache[oldSymbol];

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
