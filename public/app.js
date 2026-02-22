import { state } from './js/state.js';
import { loadSettings, setupSettingsModal, saveSettings } from './js/settings.js';
import { setupMagicInput } from './js/widgets.js';
import { fetchData, startRefreshInterval } from './js/data.js';
import { loadState, saveState } from './js/state.js';
import { fetchMarketHours } from './js/market.js';
import { LIMITS } from './js/config.js';

document.addEventListener('DOMContentLoaded', () => {
    state.grid = GridStack.init({
        float: true,
        cellHeight: 100,
        minRow: 1,
        margin: 10,
        column: 12,
        disableOneColumnMode: true
    });

    loadSettings();

    fetch('/api/me')
        .then(res => res.json())
        .then(user => {
            if (user.is_paying) {
                LIMITS.REFRESH_RATE.MIN = 1000;
                document.getElementById('refresh-rate-input').min = 1000;
            } else if (state.REFRESH_RATE < 5000) {
                state.REFRESH_RATE = 5000;
                saveSettings();
            }
        })
        .catch(console.error)
        .finally(() => {
            loadState().then(async () => {
                await fetchMarketHours();
                fetchData();
                startRefreshInterval();
            });
        });

    setupMagicInput();
    setupSettingsModal();
    state.grid.on('change', saveState);
});