export const WORKER_URL = 'https://finance.learningis1.st';

export const MIN_REFRESH_RATE = 500;
export const MAX_REFRESH_RATE = 10000;

export const MIN_WIDGET_SIZE = 1;
export const MAX_WIDGET_SIZE = 12;

export const MIN_DECIMAL_PRECISION = 2;
export const MAX_DECIMAL_PRECISION = 6;

// Asset types that are always fetched regardless of market hours
export const ALWAYS_FETCH_TYPES = ['FUTURE', 'FOREX'];

export const ASSET_TO_MARKET_MAP = {
    'EQUITY': 'equity',
    'OPTION': 'option',
    'BOND': 'bond',
    'FUTURE': 'future',
    'FOREX': 'forex'
};

// Mutable state
export const state = {
    REFRESH_RATE: 1000,
    DEFAULT_WIDGET_WIDTH: 2,
    DEFAULT_WIDGET_HEIGHT: 2,
    DECIMAL_PRECISION: 2,
    grid: null,
    isRestoring: false,
    symbolList: [],
    previousPrices: {},
    flashTimeouts: {},
    refreshInterval: null,
    isFetching: false,
    saveTimeout: null,
    assetTypeCache: {}
};
