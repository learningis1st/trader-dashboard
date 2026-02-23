import { LIMITS } from './config.js';
import {
    getState,
    setRefreshRate,
    setDefaultWidgetWidth,
    setDefaultWidgetHeight,
    setDecimalPrecision,
    setPriceType
} from './state.js';

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
        if (s.refreshRate) setRefreshRate(clamp(s.refreshRate, LIMITS.REFRESH_RATE));
        if (s.defaultWidgetWidth) setDefaultWidgetWidth(clamp(s.defaultWidgetWidth, LIMITS.WIDGET_SIZE));
        if (s.defaultWidgetHeight) setDefaultWidgetHeight(clamp(s.defaultWidgetHeight, LIMITS.WIDGET_SIZE));
        if (s.decimalPrecision) setDecimalPrecision(clamp(s.decimalPrecision, LIMITS.DECIMAL_PRECISION));
        if (s.priceType) setPriceType(s.priceType);
    } catch (e) {
        console.error('Failed to parse settings:', e);
    }
}

export function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        refreshRate: getState().REFRESH_RATE,
        defaultWidgetWidth: getState().DEFAULT_WIDGET_WIDTH,
        defaultWidgetHeight: getState().DEFAULT_WIDGET_HEIGHT,
        decimalPrecision: getState().DECIMAL_PRECISION,
        priceType: getState().PRICE_TYPE
    }));
}
