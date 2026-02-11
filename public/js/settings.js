import {
    MIN_REFRESH_RATE, MAX_REFRESH_RATE,
    MIN_WIDGET_SIZE, MAX_WIDGET_SIZE,
    MIN_DECIMAL_PRECISION, MAX_DECIMAL_PRECISION,
    state
} from './config.js';
import { startRefreshInterval, fetchData } from './data.js';

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

    let newRate = parseInt(input.value, 10);
    if (isNaN(newRate) || newRate < MIN_REFRESH_RATE) {
        newRate = MIN_REFRESH_RATE;
    } else if (newRate > MAX_REFRESH_RATE) {
        newRate = MAX_REFRESH_RATE;
    }

    let newWidth = parseInt(widthInput.value, 10);
    if (isNaN(newWidth) || newWidth < MIN_WIDGET_SIZE) {
        newWidth = MIN_WIDGET_SIZE;
    } else if (newWidth > MAX_WIDGET_SIZE) {
        newWidth = MAX_WIDGET_SIZE;
    }

    let newHeight = parseInt(heightInput.value, 10);
    if (isNaN(newHeight) || newHeight < MIN_WIDGET_SIZE) {
        newHeight = MIN_WIDGET_SIZE;
    } else if (newHeight > MAX_WIDGET_SIZE) {
        newHeight = MAX_WIDGET_SIZE;
    }

    let newPrecision = parseInt(precisionInput.value, 10);
    if (isNaN(newPrecision) || newPrecision < MIN_DECIMAL_PRECISION) {
        newPrecision = MIN_DECIMAL_PRECISION;
    } else if (newPrecision > MAX_DECIMAL_PRECISION) {
        newPrecision = MAX_DECIMAL_PRECISION;
    }

    state.REFRESH_RATE = newRate;
    state.DEFAULT_WIDGET_WIDTH = newWidth;
    state.DEFAULT_WIDGET_HEIGHT = newHeight;
    state.DECIMAL_PRECISION = newPrecision;

    saveSettings();
    startRefreshInterval();
    fetchData();
    modal.classList.add('hidden');
}

export function loadSettings() {
    const raw = localStorage.getItem('trader_dashboard_settings');
    if (raw) {
        try {
            const settings = JSON.parse(raw);
            if (settings.refreshRate >= MIN_REFRESH_RATE && settings.refreshRate <= MAX_REFRESH_RATE) {
                state.REFRESH_RATE = settings.refreshRate;
            }
            if (settings.defaultWidgetWidth >= MIN_WIDGET_SIZE && settings.defaultWidgetWidth <= MAX_WIDGET_SIZE) {
                state.DEFAULT_WIDGET_WIDTH = settings.defaultWidgetWidth;
            }
            if (settings.defaultWidgetHeight >= MIN_WIDGET_SIZE && settings.defaultWidgetHeight <= MAX_WIDGET_SIZE) {
                state.DEFAULT_WIDGET_HEIGHT = settings.defaultWidgetHeight;
            }
            if (settings.decimalPrecision >= MIN_DECIMAL_PRECISION && settings.decimalPrecision <= MAX_DECIMAL_PRECISION) {
                state.DECIMAL_PRECISION = settings.decimalPrecision;
            }
        } catch (e) {
            console.error("Failed to parse settings:", e);
        }
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
