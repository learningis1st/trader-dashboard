export const state = {
    // User settings
    REFRESH_RATE: 5000,
    DEFAULT_WIDGET_WIDTH: 2,
    DEFAULT_WIDGET_HEIGHT: 2,
    DECIMAL_PRECISION: 2,
    PRICE_TYPE: 'mark',

    // Runtime state
    grid: null,
    isRestoring: false,
    isFetching: false,
    refreshInterval: null,

    // Data caches
    symbolList: [],
    previousPrices: {},
    assetTypeCache: {},
    flashTimeouts: {},
    lastQuotes: {}
};
