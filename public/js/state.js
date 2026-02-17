import { state } from './config.js';
import { unescapeHtml } from './utils.js';
import { addSymbolWidget } from './widgets.js';

const STORAGE_KEY = 'trader_dashboard_layout';
const DEBOUNCE_LOCAL = 100;
const DEBOUNCE_CLOUD = 1000;

let localDebounce = null;
let cloudDebounce = null;

export function saveState() {
    if (state.isRestoring) return;

    clearTimeout(localDebounce);
    localDebounce = setTimeout(() => {
        const layout = state.grid.engine.nodes.map(node => ({
            symbol: unescapeHtml(node.id),
            x: node.x,
            y: node.y,
            w: node.w,
            h: node.h
        }));

        localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));

        clearTimeout(cloudDebounce);
        cloudDebounce = setTimeout(() => {
            fetch('/api/layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(layout)
            }).catch(err => console.error('Cloud save failed:', err));
        }, DEBOUNCE_CLOUD);
    }, DEBOUNCE_LOCAL);
}

export async function loadState() {
    try {
        const res = await fetch('/api/layout');

        if (res.redirected && res.url.includes('/login')) {
            window.location.reload();
            return;
        }

        if (!res.ok) throw new Error('API unavailable');

        const layout = await res.json();
        if (Array.isArray(layout)) {
            applyLayout(layout);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
            return;
        }
    } catch (e) {
        console.warn('Cloud load failed, falling back to local:', e);
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            applyLayout(JSON.parse(raw));
        } catch (e) {
            console.error('Local load failed:', e);
        }
    }
}

function applyLayout(layout) {
    state.isRestoring = true;
    state.grid.batchUpdate();
    state.grid.removeAll();
    state.symbolList = [];

    layout.forEach(item => item.symbol && addSymbolWidget(item.symbol, item));

    state.grid.commit();
    state.isRestoring = false;
}
