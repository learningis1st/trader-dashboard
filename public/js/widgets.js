import { getState } from './state.js';
import { escapeHtml } from './utils.js';
import { createWidgetHtml } from './widget-template.js';

export function addWidgetToGrid(symbol, options = null) {
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
}

export function removeWidgetFromGrid(symbol) {
    const widget = document.getElementById(`widget-${symbol}`)?.closest('.grid-stack-item');
    if (widget) {
        getState().grid.removeWidget(widget);
    }
}

export function getWidgetNode(symbol) {
    const widget = document.getElementById(`widget-${symbol}`)?.closest('.grid-stack-item');
    return widget?.gridstackNode || null;
}

export function clearGrid() {
    getState().grid.removeAll();
}

export function batchUpdateGrid() {
    getState().grid.batchUpdate();
}

export function commitGrid() {
    getState().grid.commit();
}
