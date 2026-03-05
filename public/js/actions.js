import { getState, addSymbol, removeSymbol as removeSymbolFromState, setIsRestoring, clearSymbolList } from './store/state.js';
import { saveLayout } from './store/layout-store.js';
import { fetchData } from './data.js';
import { addWidgetToGrid, removeWidgetFromGrid, getWidgetNode, clearGrid, batchUpdateGrid, commitGrid } from './components/widgets.js';
import { createTickerInput } from './components/ui.js';

const normalizeSymbol = (symbol) => (typeof symbol === 'string' ? symbol.trim().toUpperCase() : '');

export function applyLayoutAction(layout) {
    setIsRestoring(true);
    batchUpdateGrid();
    clearGrid();
    clearSymbolList();

    layout.forEach(item => item.symbol && addSymbolAction(item.symbol, item));

    commitGrid();
    setIsRestoring(false);
}

export function addSymbolAction(symbol, options = null) {
    const normalized = normalizeSymbol(symbol);
    if (!normalized || getState().symbolList.includes(normalized)) return;

    addSymbol(normalized);
    addWidgetToGrid(normalized, options);

    saveLayout();
    window.dispatchEvent(new CustomEvent('update-empty-hint'));
}

export function removeSymbolAction(symbol) {
    const normalized = normalizeSymbol(symbol);
    if (!normalized) return;

    removeWidgetFromGrid(normalized);
    removeSymbolFromState(normalized);

    delete getState().previousPrices[normalized];
    delete getState().assetTypeCache[normalized];
    delete getState().lastQuotes[normalized];

    const pendingFlash = getState().flashTimeouts[normalized];
    if (pendingFlash) {
        clearTimeout(pendingFlash);
        delete getState().flashTimeouts[normalized];
    }

    window.dispatchEvent(new CustomEvent('widget-removed', { detail: { symbol: normalized } }));

    saveLayout();
    window.dispatchEvent(new CustomEvent('update-empty-hint'));
}

export function replaceSymbolAction(oldSymbol, newSymbol) {
    const normalizedOld = normalizeSymbol(oldSymbol);
    const normalizedNew = normalizeSymbol(newSymbol);
    if (!normalizedOld || !normalizedNew) return false;

    const node = getWidgetNode(normalizedOld);
    if (!node) return false;

    const position = { x: node.x, y: node.y, w: node.w, h: node.h };

    removeSymbolAction(normalizedOld);
    addSymbolAction(normalizedNew, position);
    fetchData();
    return true;
}

export function editTickerAction(oldSymbol, el) {
    const normalizedOld = normalizeSymbol(oldSymbol);

    createTickerInput(normalizedOld, el, (newSymbol) => {
        const normalizedNew = normalizeSymbol(newSymbol);
        if (!normalizedNew || normalizedNew === normalizedOld) return false;

        if (getState().symbolList.includes(normalizedNew)) {
            alert(`Symbol ${normalizedNew} is already on the dashboard.`);
            return false;
        }

        return replaceSymbolAction(normalizedOld, normalizedNew);
    });
}

export function openTradingViewAction(symbol) {
    const normalized = normalizeSymbol(symbol);
    if (!normalized) return;
    window.open(`https://www.tradingview.com/chart/?symbol=${normalized}`, '_blank');
}

window.widgetActions = {
    removeSymbol: removeSymbolAction,
    openTradingView: openTradingViewAction,
    editTicker: editTickerAction
};
