import { state } from './js/config.js';
import { loadSettings, setupSettingsModal } from './js/settings.js';
import { setupMagicInput } from './js/widgets.js';
import { fetchData, startRefreshInterval } from './js/data.js';
import { loadState, saveState } from './js/state.js';

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

    loadState().then(() => {
        fetchData();
        startRefreshInterval();
    });

    setupMagicInput();
    setupSettingsModal();

    state.grid.on('change', saveState);
});
