import {
    MIN_REFRESH_RATE, MAX_REFRESH_RATE,
    MIN_WIDGET_SIZE, MAX_WIDGET_SIZE,
    MIN_DECIMAL_PRECISION, MAX_DECIMAL_PRECISION,
    state
} from './config.js';
import { startRefreshInterval, fetchData } from './data.js';

function clamp(value, min, max) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < min) return min;
    if (num > max) return max;
    return num;
}

function updateSliderTrack(slider) {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const percent = ((val - min) / (max - min)) * 100;
    slider.style.setProperty('--value-percent', percent + '%');
}

export function setupSettingsModal() {
    const btn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    const input = document.getElementById('refresh-rate-input');
    const widthInput = document.getElementById('widget-width-input');
    const heightInput = document.getElementById('widget-height-input');
    const precisionInput = document.getElementById('decimal-precision-input');
    const cancelBtn = document.getElementById('settings-cancel');
    const saveBtn = document.getElementById('settings-save');

    // Value display elements for sliders
    const widthValue = document.getElementById('widget-width-value');
    const heightValue = document.getElementById('widget-height-value');
    const precisionValue = document.getElementById('decimal-precision-value');

    // Live update functions for sliders
    const updateWidthDisplay = () => {
        widthValue.textContent = widthInput.value;
        updateSliderTrack(widthInput);
    };
    const updateHeightDisplay = () => {
        heightValue.textContent = heightInput.value;
        updateSliderTrack(heightInput);
    };
    const updatePrecisionDisplay = () => {
        precisionValue.textContent = precisionInput.value;
        updateSliderTrack(precisionInput);
    };

    // Add input listeners for live updates (sliders only)
    widthInput.addEventListener('input', updateWidthDisplay);
    heightInput.addEventListener('input', updateHeightDisplay);
    precisionInput.addEventListener('input', updatePrecisionDisplay);

    btn.addEventListener('click', () => {
        input.value = state.REFRESH_RATE;
        widthInput.value = state.DEFAULT_WIDGET_WIDTH;
        heightInput.value = state.DEFAULT_WIDGET_HEIGHT;
        precisionInput.value = state.DECIMAL_PRECISION;

        // Update slider displays
        updateWidthDisplay();
        updateHeightDisplay();
        updatePrecisionDisplay();

        modal.classList.remove('hidden');
    });

    cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    saveBtn.addEventListener('click', () => {
        saveSettingsFromModal();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    // Handle Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
        }
    });
}

function saveSettingsFromModal() {
    const modal = document.getElementById('settings-modal');
    const input = document.getElementById('refresh-rate-input');
    const widthInput = document.getElementById('widget-width-input');
    const heightInput = document.getElementById('widget-height-input');
    const precisionInput = document.getElementById('decimal-precision-input');

    state.REFRESH_RATE = clamp(input.value, MIN_REFRESH_RATE, MAX_REFRESH_RATE);
    state.DEFAULT_WIDGET_WIDTH = clamp(widthInput.value, MIN_WIDGET_SIZE, MAX_WIDGET_SIZE);
    state.DEFAULT_WIDGET_HEIGHT = clamp(heightInput.value, MIN_WIDGET_SIZE, MAX_WIDGET_SIZE);
    state.DECIMAL_PRECISION = clamp(precisionInput.value, MIN_DECIMAL_PRECISION, MAX_DECIMAL_PRECISION);

    saveSettings();
    startRefreshInterval();
    fetchData();
    modal.classList.add('hidden');
}

export function loadSettings() {
    const raw = localStorage.getItem('trader_dashboard_settings');
    if (!raw) return;

    try {
        const settings = JSON.parse(raw);

        if (settings.refreshRate) {
            state.REFRESH_RATE = clamp(settings.refreshRate, MIN_REFRESH_RATE, MAX_REFRESH_RATE);
        }
        if (settings.defaultWidgetWidth) {
            state.DEFAULT_WIDGET_WIDTH = clamp(settings.defaultWidgetWidth, MIN_WIDGET_SIZE, MAX_WIDGET_SIZE);
        }
        if (settings.defaultWidgetHeight) {
            state.DEFAULT_WIDGET_HEIGHT = clamp(settings.defaultWidgetHeight, MIN_WIDGET_SIZE, MAX_WIDGET_SIZE);
        }
        if (settings.decimalPrecision) {
            state.DECIMAL_PRECISION = clamp(settings.decimalPrecision, MIN_DECIMAL_PRECISION, MAX_DECIMAL_PRECISION);
        }
    } catch (e) {
        console.error("Failed to parse settings:", e);
    }
}

export function saveSettings() {
    const settings = {
        refreshRate: state.REFRESH_RATE,
        defaultWidgetWidth: state.DEFAULT_WIDGET_WIDTH,
        defaultWidgetHeight: state.DEFAULT_WIDGET_HEIGHT,
        decimalPrecision: state.DECIMAL_PRECISION
    };
    localStorage.setItem('trader_dashboard_settings', JSON.stringify(settings));
}
