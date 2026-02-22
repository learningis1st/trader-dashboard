import { state, saveState } from './state.js';
import { escapeHtml } from './utils.js';
import { fetchData } from './data.js';
import { updateEmptyHint } from './ui.js';

export function setupMagicInput() {
    const modal = document.getElementById('magic-modal');
    const input = document.getElementById('symbol-input');

    const closeModal = () => modal.classList.add('hidden');
    const openModal = () => {
        modal.classList.remove('hidden');
        input.value = '';
        input.focus();
    };

    document.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === '`') {
            e.preventDefault();
            openModal();
        }
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            const symbol = input.value.trim().toUpperCase();
            if (symbol) {
                addSymbolWidget(symbol);
                closeModal();
                fetchData();
            }
        } else if (e.key === 'Escape') {
            closeModal();
            input.blur();
        }
    });
}

function createWidgetHtml(symbol) {
    return `
        <div class="h-full w-full p-4 flex flex-col justify-between relative group widget-container" id="widget-${symbol}">
            <div class="flex justify-between items-start">
                <span class="responsive-symbol font-bold text-gray-100 cursor-pointer hover:text-blue-400 transition-colors"
                      data-symbol="${symbol}"
                      onclick="window.widgetActions.editTicker(this.dataset.symbol, this)">
                    ${symbol}
                </span>
                <button data-symbol="${symbol}"
                        onclick="window.widgetActions.removeSymbol(this.dataset.symbol)"
                        class="remove-btn opacity-0 transition-opacity text-gray-400 hover:text-red-500 p-1">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="flex-grow flex items-center justify-center">
                <span class="responsive-price font-mono font-bold text-gray-300 tracking-tighter cursor-pointer"
                      id="price-${symbol}"
                      data-symbol="${symbol}"
                      ondblclick="window.widgetActions.openTradingView(this.dataset.symbol)">
                    ---
                </span>
            </div>
            <div class="flex justify-between items-end font-medium">
                <span id="chg-${symbol}" class="responsive-detail text-gray-500">--</span>
                <span id="pct-${symbol}" class="responsive-detail text-gray-500">--%</span>
            </div>
        </div>`;
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

    saveState();
    updateEmptyHint();
}

export function removeSymbol(symbol) {
    const widget = document.getElementById(`widget-${symbol}`)?.closest('.grid-stack-item');
    if (!widget) return;

    state.grid.removeWidget(widget);
    state.symbolList = state.symbolList.filter(s => s !== symbol);
    delete state.previousPrices[symbol];
    delete state.assetTypeCache[symbol];

    saveState();
    updateEmptyHint();
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
