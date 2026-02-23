import { getState, addSymbol, removeSymbol as removeSymbolFromState, setIsRestoring, clearSymbolList } from './state.js';
import { saveLayout } from './layout-store.js';
import { fetchData } from './data.js';
import { addWidgetToGrid, removeWidgetFromGrid, getWidgetNode, clearGrid, batchUpdateGrid, commitGrid } from './widgets.js';
import { createTickerInput } from './ui.js';

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
    if (getState().symbolList.includes(symbol)) return;

    addSymbol(symbol);
    addWidgetToGrid(symbol, options);

    saveLayout();
    window.dispatchEvent(new CustomEvent('update-empty-hint'));
}

export function removeSymbolAction(symbol) {
    removeWidgetFromGrid(symbol);
    removeSymbolFromState(symbol);
    delete getState().previousPrices[symbol];
    delete getState().assetTypeCache[symbol];

    saveLayout();
    window.dispatchEvent(new CustomEvent('update-empty-hint'));
}

export function replaceSymbolAction(oldSymbol, newSymbol) {
    const node = getWidgetNode(oldSymbol);
    if (!node) return false;

    const position = { x: node.x, y: node.y, w: node.w, h: node.h };

    removeSymbolAction(oldSymbol);
    addSymbolAction(newSymbol, position);
    fetchData();
    return true;
}

export function editTickerAction(oldSymbol, el) {
    createTickerInput(oldSymbol, el, (newSymbol) => {
        if (!newSymbol || newSymbol === oldSymbol) return false;

        if (getState().symbolList.includes(newSymbol)) {
            alert(`Symbol ${newSymbol} is already on the dashboard.`);
            return false;
        }

        return replaceSymbolAction(oldSymbol, newSymbol);
    });
}

export function openTradingViewAction(symbol) {
    window.open(`https://www.tradingview.com/chart/?symbol=${symbol}`, '_blank');
}

window.widgetActions = {
    removeSymbol: removeSymbolAction,
    openTradingView: openTradingViewAction,
    editTicker: editTickerAction
};
