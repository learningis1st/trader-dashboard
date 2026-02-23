export function createWidgetHtml(symbol) {
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
