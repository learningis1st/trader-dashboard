const WORKER_URL = 'https://finance.learningis1.st';
const REFRESH_RATE = 1000;

let grid = null;
let symbolList = [];
let previousPrices = {}; // Stores last known price for flashing logic

document.addEventListener('DOMContentLoaded', () => {
    grid = GridStack.init({
        float: true,
        cellHeight: 100,
        minRow: 1,
        margin: 10,
        column: 12,
        disableOneColumnMode: true
    });

    loadState();
    fetchData();
    setInterval(fetchData, REFRESH_RATE);
    setupMagicInput();

    grid.on('change', saveState);
});

function setupMagicInput() {
    const modal = document.getElementById('magic-modal');
    const input = document.getElementById('symbol-input');

    document.addEventListener('keydown', (e) => {
        if (e.key === '`') {
            e.preventDefault();
            modal.classList.remove('hidden');
            input.value = '';
            input.focus();
        }
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const rawVal = input.value.trim().toUpperCase();
            if (rawVal) {
                addSymbolWidget(rawVal);
                modal.classList.add('hidden');
                fetchData();
            }
        }
    });
}

function addSymbolWidget(symbol, node = null) {
    if (symbolList.includes(symbol)) return;
    symbolList.push(symbol);

    const widgetHtml = `
        <div class="h-full w-full p-4 flex flex-col justify-between relative group widget-container" id="widget-${symbol}">
            <div class="flex justify-between items-start">
                <span class="responsive-symbol font-bold text-gray-100 cursor-pointer hover:text-blue-400 transition-colors" 
                      onclick="editTicker('${symbol}', this)" 
                      title="Click to edit">${symbol}</span>
                <button onclick="removeSymbol('${symbol}')" class="remove-btn opacity-0 transition-opacity text-gray-400 hover:text-red-500 p-1">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="flex-grow flex items-center justify-center">
                <span class="responsive-price font-mono font-bold text-gray-300 tracking-tighter" id="price-${symbol}">---</span>
            </div>
            
            <div class="flex justify-between items-end font-medium">
                <span id="chg-${symbol}" class="responsive-detail text-gray-500">--</span>
                <span id="pct-${symbol}" class="responsive-detail text-gray-500">--%</span>
            </div>
        </div>
    `;

    const options = node || { w: 3, h: 2, autoPosition: true };

    grid.addWidget({
        ...options,
        content: widgetHtml,
        id: symbol
    });

    saveState();
}

window.removeSymbol = function(symbol) {
    const el = document.getElementById(`widget-${symbol}`).closest('.grid-stack-item');
    grid.removeWidget(el);
    symbolList = symbolList.filter(s => s !== symbol);
    delete previousPrices[symbol]; // Cleanup history
    saveState();
};

window.editTicker = function(oldSymbol, el) {
    // Create the input element to replace the span
    const input = document.createElement('input');
    input.type = 'text';
    input.value = oldSymbol;
    input.className = 'bg-gray-700 text-white responsive-symbol font-bold w-[50cqmin] px-1 rounded border border-blue-500 uppercase focus:outline-none';

    const parent = el.parentNode;

    const finish = () => {
        const newSymbol = input.value.trim().toUpperCase();

        // If cancelled, empty, or unchanged -> Revert to text
        if (!newSymbol || newSymbol === oldSymbol) {
            parent.replaceChild(el, input);
            return;
        }

        // Prevent duplicates
        if (symbolList.includes(newSymbol)) {
            alert(`Symbol ${newSymbol} is already on the dashboard.`);
            parent.replaceChild(el, input);
            return;
        }

        // Proceed with replacement
        // 1. Get geometry of current widget
        const widgetEl = document.getElementById(`widget-${oldSymbol}`).closest('.grid-stack-item');
        const node = widgetEl.gridstackNode;

        if (node) {
            const options = { x: node.x, y: node.y, w: node.w, h: node.h };

            // 2. Remove old widget logic
            grid.removeWidget(widgetEl);
            symbolList = symbolList.filter(s => s !== oldSymbol);
            delete previousPrices[oldSymbol]; // Cleanup old symbol history

            // 3. Add new widget with same geometry
            addSymbolWidget(newSymbol, options);

            // 4. Trigger fetch immediately
            fetchData();
        } else {
            parent.replaceChild(el, input);
        }
    };

    // Handle Input Events
    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur(); // Trigger finish
        } else if (e.key === 'Escape') {
            input.value = oldSymbol; // Reset to ensure revert
            input.blur();
        }
    });

    // Swap and focus
    parent.replaceChild(input, el);
    input.focus();
    input.select();
};

async function fetchData() {
    if (symbolList.length === 0) return;

    try {
        const symbolsParam = symbolList.join(',');
        const response = await fetch(`${WORKER_URL}/quote?symbol=${symbolsParam}&fields=quote`);
        if (!response.ok) throw new Error('API Error');

        const data = await response.json();
        updateUI(data);
    } catch (error) {
        console.error("Fetch failed:", error);
    }
}

function updateUI(data) {
    Object.keys(data).forEach(symbol => {
        try {
            const quote = data[symbol].quote;
            if (!quote) return;

            const priceEl = document.getElementById(`price-${symbol}`);
            const chgEl = document.getElementById(`chg-${symbol}`);
            const pctEl = document.getElementById(`pct-${symbol}`);

            if (priceEl && chgEl && pctEl) {
                const currentPrice = quote.lastPrice || 0;
                const netChange = quote.netChange || 0;
                const netPercentChange = quote.netPercentChange || 0;

                const oldPrice = previousPrices[symbol];

                if (oldPrice !== undefined && currentPrice !== oldPrice) {
                    priceEl.classList.remove('flash-up', 'flash-down');

                    void priceEl.offsetWidth;

                    if (currentPrice > oldPrice) {
                        priceEl.classList.add('flash-up');
                    } else {
                        priceEl.classList.add('flash-down');
                    }

                    setTimeout(() => {
                        priceEl.classList.remove('flash-up', 'flash-down');
                    }, 700);
                }

                previousPrices[symbol] = currentPrice;

                priceEl.innerText = currentPrice.toFixed(2);
                chgEl.innerText = (netChange > 0 ? '+' : '') + netChange.toFixed(2);
                pctEl.innerText = (netPercentChange > 0 ? '+' : '') + netPercentChange.toFixed(2) + '%';

                [priceEl, chgEl, pctEl].forEach(el => {
                    el.classList.remove('text-[#4ade80]', 'text-[#f87171]', 'text-gray-300', 'text-gray-500');
                });

                if (netChange > 0) {
                    [priceEl, chgEl, pctEl].forEach(el => el.classList.add('text-[#4ade80]'));
                } else if (netChange < 0) {
                    [priceEl, chgEl, pctEl].forEach(el => el.classList.add('text-[#f87171]'));
                } else {
                    priceEl.classList.add('text-gray-300');
                    chgEl.classList.add('text-gray-500');
                    pctEl.classList.add('text-gray-500');
                }
            }
        } catch (err) {
            console.error(`Error updating symbol ${symbol}:`, err);
        }
    });
}

let saveTimeout = null;
function saveState() {
    const layout = [];
    grid.engine.nodes.forEach(node => {
        layout.push({
            symbol: node.id,
            x: node.x, y: node.y, w: node.w, h: node.h
        });
    });

    // 1. Save to LocalStorage immediately (as backup/fast cache)
    localStorage.setItem('trader_dashboard_layout', JSON.stringify(layout));

    // 2. Debounce cloud sync (wait 1 second after last change)
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(() => {
        fetch('/api/layout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(layout)
        }).catch(err => console.error("Cloud save failed:", err));
    }, 1000);
}

async function loadState() {
    try {
        // 1. Try to fetch from Cloud
        const res = await fetch('/api/layout');
        if (!res.ok) throw new Error("API unavailable");

        const layout = await res.json();

        if (layout && layout.length > 0) {
            applyLayout(layout);
            // Update local cache
            localStorage.setItem('trader_dashboard_layout', JSON.stringify(layout));
            return;
        }
    } catch (e) {
        console.warn("Cloud load failed, falling back to local:", e);
    }

    // 2. Fallback to LocalStorage
    const raw = localStorage.getItem('trader_dashboard_layout');
    if (raw) {
        try {
            applyLayout(JSON.parse(raw));
        } catch (e) { console.error("Local load failed", e); }
    }
}

function applyLayout(layout) {
    grid.batchUpdate();
    grid.removeAll(); // Clear existing widgets if any
    layout.forEach(item => {
        if(item.symbol) addSymbolWidget(item.symbol, item);
    });
    grid.commit();
}