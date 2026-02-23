import { LIMITS } from './config.js';
import {
    getState,
    setRefreshRate,
    setDefaultWidgetWidth,
    setDefaultWidgetHeight,
    setDecimalPrecision,
    setPriceType
} from './state.js';
import { startRefreshInterval, fetchData, updateUIFromCache } from './data.js';
import { saveSettings, clamp } from './settings-store.js';

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
        inputs.refresh.value = getState().REFRESH_RATE;
        inputs.width.value = getState().DEFAULT_WIDGET_WIDTH;
        inputs.height.value = getState().DEFAULT_WIDGET_HEIGHT;
        inputs.precision.value = getState().DECIMAL_PRECISION;
        setPriceType(getState().PRICE_TYPE || 'mark');

        Object.values(updaters).forEach(fn => fn());
        modal.classList.remove('hidden');
    };

    const closeModal = () => modal.classList.add('hidden');

    const saveAndClose = () => {
        setRefreshRate(clamp(inputs.refresh.value, LIMITS.REFRESH_RATE));
        setDefaultWidgetWidth(clamp(inputs.width.value, LIMITS.WIDGET_SIZE));
        setDefaultWidgetHeight(clamp(inputs.height.value, LIMITS.WIDGET_SIZE));
        setDecimalPrecision(clamp(inputs.precision.value, LIMITS.DECIMAL_PRECISION));
        setPriceType(getPriceType());

        saveSettings();

        startRefreshInterval();
        updateUIFromCache();
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
