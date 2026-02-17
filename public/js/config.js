export const WORKER_URL = 'https://finance.learningis1.st';

export const LIMITS = {
    REFRESH_RATE: { MIN: 500, MAX: 10000 },
    WIDGET_SIZE: { MIN: 1, MAX: 12 },
    DECIMAL_PRECISION: { MIN: 2, MAX: 6 }
};

export const ASSET_TO_MARKET_MAP = {
    EQUITY: 'equity',
    OPTION: 'option',
    BOND: 'bond',
    FUTURE: 'future',
    FOREX: 'forex'
};

export const state = {
    // User settings
    REFRESH_RATE: 1000,
    DEFAULT_WIDGET_WIDTH: 2,
    DEFAULT_WIDGET_HEIGHT: 2,
    DECIMAL_PRECISION: 2,

    // Runtime state
    grid: null,
    isRestoring: false,
    isFetching: false,
    refreshInterval: null,

    // Data caches
    symbolList: [],
    previousPrices: {},
    assetTypeCache: {},
    flashTimeouts: {}
};
