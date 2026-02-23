import { LIMITS } from './config.js';
import { state } from './state.js';

const STORAGE_KEY = 'trader_dashboard_settings';

export function clamp(value, { MIN, MAX }) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < MIN) return MIN;
    return num > MAX ? MAX : num;
}

export function loadSettings() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
        const s = JSON.parse(raw);
        if (s.refreshRate) state.REFRESH_RATE = clamp(s.refreshRate, LIMITS.REFRESH_RATE);
        if (s.defaultWidgetWidth) state.DEFAULT_WIDGET_WIDTH = clamp(s.defaultWidgetWidth, LIMITS.WIDGET_SIZE);
        if (s.defaultWidgetHeight) state.DEFAULT_WIDGET_HEIGHT = clamp(s.defaultWidgetHeight, LIMITS.WIDGET_SIZE);
        if (s.decimalPrecision) state.DECIMAL_PRECISION = clamp(s.decimalPrecision, LIMITS.DECIMAL_PRECISION);
        if (s.priceType) state.PRICE_TYPE = s.priceType;
    } catch (e) {
        console.error('Failed to parse settings:', e);
    }
}

export function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        refreshRate: state.REFRESH_RATE,
        defaultWidgetWidth: state.DEFAULT_WIDGET_WIDTH,
        defaultWidgetHeight: state.DEFAULT_WIDGET_HEIGHT,
        decimalPrecision: state.DECIMAL_PRECISION,
        priceType: state.PRICE_TYPE
    }));
}
