import { addSymbolAction } from './actions.js';
import { fetchData } from './data.js';

export function setupMagicInput() {
    const modal = document.getElementById('magic-modal');
    const input = document.getElementById('symbol-input');

    const closeModal = () => modal.classList.add('hidden');
    const openModal = () => {
        modal.classList.remove('hidden');
        input.value = '';
        input.focus();
    };

    document.addEventListener('keydown', e => {
        // Prevent triggering if user is already typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === '`') {
            e.preventDefault();
            openModal();
        }
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            const symbol = input.value.trim().toUpperCase();
            if (symbol) {
                addSymbolWidget(symbol);
                closeModal();
                fetchData();
            }
        } else if (e.key === 'Escape') {
            closeModal();
            input.blur();
        }
    });
}
