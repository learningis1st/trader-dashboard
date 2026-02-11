import { state } from './config.js';
import { unescapeHtml } from './utils.js';
import { addSymbolWidget } from './widgets.js';

let layoutSaveDebounce = null;

export function saveState() {
    if (state.isRestoring) return;

    // Debounce rapid changes (e.g., during drag)
    if (layoutSaveDebounce) clearTimeout(layoutSaveDebounce);

    layoutSaveDebounce = setTimeout(() => {
        const layout = [];
        state.grid.engine.nodes.forEach(node => {
            layout.push({
                symbol: unescapeHtml(node.id),
                x: node.x, y: node.y, w: node.w, h: node.h
            });
        });

        localStorage.setItem('trader_dashboard_layout', JSON.stringify(layout));

        if (state.saveTimeout) clearTimeout(state.saveTimeout);

        state.saveTimeout = setTimeout(() => {
            fetch('/api/layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(layout)
            }).catch(err => console.error("Cloud save failed:", err));
        }, 1000);
    }, 100);
}

export async function loadState() {
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
    state.isRestoring = true;

    state.grid.batchUpdate();
    state.grid.removeAll();
    state.symbolList = [];

    layout.forEach(item => {
        if (item.symbol) addSymbolWidget(item.symbol, item);
    });

    state.grid.commit();

    state.isRestoring = false;
}
