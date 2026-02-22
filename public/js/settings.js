import { LIMITS } from './config.js';
import { state } from './state.js';
import { startRefreshInterval, fetchData, reRenderUI } from './data.js';

const STORAGE_KEY = 'trader_dashboard_settings';

function clamp(value, { MIN, MAX }) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < MIN) return MIN;
    return num > MAX ? MAX : num;
}

function updateSliderTrack(slider) {
    const percent = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.setProperty('--value-percent', `${percent}%`);
}

function createSliderUpdater(slider, display) {
    return () => {
        display.textContent = slider.value;
        updateSliderTrack(slider);
    };
}

export function setupSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const inputs = {
        refresh: document.getElementById('refresh-rate-input'),
        width: document.getElementById('widget-width-input'),
        height: document.getElementById('widget-height-input'),
        precision: document.getElementById('decimal-precision-input')
    };

    const getPriceType = () => document.querySelector('input[name="priceType"]:checked')?.value || 'mark';
    const setPriceType = (val) => {
        const radio = document.querySelector(`input[name="priceType"][value="${val}"]`);
        if (radio) radio.checked = true;
    };

    const displays = {
        width: document.getElementById('widget-width-value'),
        height: document.getElementById('widget-height-value'),
        precision: document.getElementById('decimal-precision-value')
    };

    const updaters = {
        width: createSliderUpdater(inputs.width, displays.width),
        height: createSliderUpdater(inputs.height, displays.height),
        precision: createSliderUpdater(inputs.precision, displays.precision)
    };

    inputs.width.addEventListener('input', updaters.width);
    inputs.height.addEventListener('input', updaters.height);
    inputs.precision.addEventListener('input', updaters.precision);

    const openModal = () => {
        inputs.refresh.value = state.REFRESH_RATE;
        inputs.width.value = state.DEFAULT_WIDGET_WIDTH;
        inputs.height.value = state.DEFAULT_WIDGET_HEIGHT;
        inputs.precision.value = state.DECIMAL_PRECISION;
        setPriceType(state.PRICE_TYPE || 'mark');

        Object.values(updaters).forEach(fn => fn());
        modal.classList.remove('hidden');
    };

    const closeModal = () => modal.classList.add('hidden');

    const saveAndClose = () => {
        state.REFRESH_RATE = clamp(inputs.refresh.value, LIMITS.REFRESH_RATE);
        state.DEFAULT_WIDGET_WIDTH = clamp(inputs.width.value, LIMITS.WIDGET_SIZE);
        state.DEFAULT_WIDGET_HEIGHT = clamp(inputs.height.value, LIMITS.WIDGET_SIZE);
        state.DECIMAL_PRECISION = clamp(inputs.precision.value, LIMITS.DECIMAL_PRECISION);
        state.PRICE_TYPE = getPriceType();

        saveSettings();
        startRefreshInterval();
        reRenderUI();
        fetchData();
        closeModal();
    };

    document.getElementById('settings-btn').addEventListener('click', openModal);
    document.getElementById('settings-cancel').addEventListener('click', closeModal);
    document.getElementById('settings-save').addEventListener('click', saveAndClose);
    modal.addEventListener('click', e => e.target === modal && closeModal());
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
    });
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
