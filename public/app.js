const WORKER_URL = 'https://finance.learningis1.st';
let REFRESH_RATE = 1000;

let grid = null;
let isRestoring = false;
let symbolList = [];
let previousPrices = {};
let flashTimeouts = {};
let fetchController = null;
let refreshInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    grid = GridStack.init({
        float: true,
        cellHeight: 100,
        minRow: 1,
        margin: 10,
        column: 12,
        disableOneColumnMode: true
    });

    loadSettings();

    loadState().then(() => {
        fetchData();
        startRefreshInterval();
    });

    setupMagicInput();
    setupSettingsModal();

    grid.on('change', saveState);
});

function startRefreshInterval() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    refreshInterval = setInterval(fetchData, REFRESH_RATE);
}

// --- Settings Management ---
function setupSettingsModal() {
    const btn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    const input = document.getElementById('refresh-rate-input');
    const cancelBtn = document.getElementById('settings-cancel');
    const saveBtn = document.getElementById('settings-save');

    btn.addEventListener('click', () => {
        input.value = REFRESH_RATE;
        modal.classList.remove('hidden');
        input.focus();
        input.select();
    });

    cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    saveBtn.addEventListener('click', () => {
        saveSettingsFromModal();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveSettingsFromModal();
        } else if (e.key === 'Escape') {
            modal.classList.add('hidden');
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

function saveSettingsFromModal() {
    const modal = document.getElementById('settings-modal');
    const input = document.getElementById('refresh-rate-input');

    let newRate = parseInt(input.value, 10);

    if (isNaN(newRate) || newRate < 1000) {
        newRate = 1000;
    }

    REFRESH_RATE = newRate;
    saveSettings();
    startRefreshInterval();
    modal.classList.add('hidden');
}

function loadSettings() {
    // Try localStorage first
    const raw = localStorage.getItem('trader_dashboard_settings');
    if (raw) {
        try {
            const settings = JSON.parse(raw);
            if (settings.refreshRate && settings.refreshRate >= 1000) {
                REFRESH_RATE = settings.refreshRate;
            }
        } catch (e) {
            console.error("Failed to parse settings:", e);
        }
    }
}

function saveSettings() {
    const settings = {
        refreshRate: REFRESH_RATE
    };
    localStorage.setItem('trader_dashboard_settings', JSON.stringify(settings));
}

// --- HTML Escaping Helper ---
function escapeHtml(text) {
    if (!text) return text;
    return text.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m];
    });
}

// --- HTML Unescaping Helper ---
function unescapeHtml(text) {
    if (!text) return text;
    const map = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#039;': "'"
    };
    return text.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, function(m) { return map[m]; });
}

function setupMagicInput() {
    const modal = document.getElementById('magic-modal');
    const input = document.getElementById('symbol-input');

    document.addEventListener('keydown', (e) => {
        // Prevent opening if user is typing in another input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

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
        else if (e.key === 'Escape') {
            modal.classList.add('hidden');
            input.blur();
        }
    });
}

function addSymbolWidget(symbol, node = null) {
    if (symbolList.includes(symbol)) return;
    symbolList.push(symbol);

    const safeSymbol = escapeHtml(symbol);

    const widgetHtml = `
        <div class="h-full w-full p-4 flex flex-col justify-between relative group widget-container" id="widget-${safeSymbol}">
            <div class="flex justify-between items-start">
                <span class="responsive-symbol font-bold text-gray-100 cursor-pointer hover:text-blue-400 transition-colors" 
                      data-symbol="${safeSymbol}"
                      onclick="editTicker(this.dataset.symbol, this)">${safeSymbol}</span>
                <button data-symbol="${safeSymbol}" onclick="removeSymbol(this.dataset.symbol)" class="remove-btn opacity-0 transition-opacity text-gray-400 hover:text-red-500 p-1">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="flex-grow flex items-center justify-center">
                <span class="responsive-price font-mono font-bold text-gray-300 tracking-tighter cursor-pointer" 
                      id="price-${safeSymbol}"
                      data-symbol="${safeSymbol}"
                      ondblclick="openTradingView(this.dataset.symbol)">---</span>
            </div>
            
            <div class="flex justify-between items-end font-medium">
                <span id="chg-${safeSymbol}" class="responsive-detail text-gray-500">--</span>
                <span id="pct-${safeSymbol}" class="responsive-detail text-gray-500">--%</span>
            </div>
        </div>
    `;

    const options = node || { w: 3, h: 2, autoPosition: true };

    grid.addWidget({
        ...options,
        content: widgetHtml,
        id: safeSymbol
    });

    saveState();
}

window.removeSymbol = function(symbol) {
    const el = document.getElementById(`widget-${symbol}`).closest('.grid-stack-item');
    grid.removeWidget(el);
    symbolList = symbolList.filter(s => s !== symbol);
    delete previousPrices[symbol];
    saveState();
};

window.openTradingView = function(symbol) {
    window.open(`https://www.tradingview.com/chart/?symbol=${symbol}`, '_blank');
};

window.editTicker = function(oldSymbol, el) {
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

        if (symbolList.includes(newSymbol)) {
            alert(`Symbol ${newSymbol} is already on the dashboard.`);
            parent.replaceChild(el, input);
            return;
        }

        const widgetEl = document.getElementById(`widget-${oldSymbol}`).closest('.grid-stack-item');
        const node = widgetEl.gridstackNode;

        if (node) {
            const options = { x: node.x, y: node.y, w: node.w, h: node.h };

            grid.removeWidget(widgetEl);
            symbolList = symbolList.filter(s => s !== oldSymbol);
            delete previousPrices[oldSymbol];

            addSymbolWidget(newSymbol, options);
            fetchData();
        } else {
            parent.replaceChild(el, input);
        }
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => {
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
};

let isFetching = false;

async function fetchData() {
    if (symbolList.length === 0) return;

    if (isFetching) return;

    isFetching = true; // Lock

    try {
        const symbolsParam = symbolList.map(s => encodeURIComponent(s)).join(',');

        const response = await fetch(`${WORKER_URL}/quote?symbol=${symbolsParam}&fields=quote`);

        if (response.redirected && response.url.includes('/login')) {
            window.location.reload();
            return;
        }

        if (!response.ok) throw new Error('API Error');

        const data = await response.json();
        updateUI(data);

    } catch (error) {
        console.error("Fetch failed:", error);
    } finally {
        isFetching = false;
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
                const netPercentChange = quote.netPercentChange || quote.futurePercentChange || 0;
                const oldPrice = previousPrices[symbol];

                if (oldPrice !== undefined && currentPrice !== oldPrice) {
                    if (flashTimeouts[symbol]) {
                        clearTimeout(flashTimeouts[symbol]);
                    }

                    priceEl.classList.remove('flash-up', 'flash-down');
                    void priceEl.offsetWidth;

                    if (currentPrice > oldPrice) {
                        priceEl.classList.add('flash-up');
                    } else {
                        priceEl.classList.add('flash-down');
                    }

                    flashTimeouts[symbol] = setTimeout(() => {
                        priceEl.classList.remove('flash-up', 'flash-down');
                        delete flashTimeouts[symbol];
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
    if (isRestoring) return;

    const layout = [];
    grid.engine.nodes.forEach(node => {
        layout.push({
            symbol: unescapeHtml(node.id),
            x: node.x, y: node.y, w: node.w, h: node.h
        });
    });

    localStorage.setItem('trader_dashboard_layout', JSON.stringify(layout));

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
        const res = await fetch('/api/layout');

        if (res.redirected && res.url.includes('/login')) {
            window.location.reload();
            return;
        }

        if (!res.ok) throw new Error("API unavailable");

        const layout = await res.json();

        if (Array.isArray(layout)) {
            applyLayout(layout);
            localStorage.setItem('trader_dashboard_layout', JSON.stringify(layout));
            return;
        }
    } catch (e) {
        console.warn("Cloud load failed, falling back to local:", e);
    }

    const raw = localStorage.getItem('trader_dashboard_layout');
    if (raw) {
        try {
            applyLayout(JSON.parse(raw));
        } catch (e) { console.error("Local load failed", e); }
    }
}

function applyLayout(layout) {
    isRestoring = true;

    grid.batchUpdate();
    grid.removeAll();
    symbolList = [];

    layout.forEach(item => {
        if(item.symbol) addSymbolWidget(item.symbol, item);
    });

    grid.commit();

    isRestoring = false;
}