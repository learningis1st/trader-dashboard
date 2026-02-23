const _state = {
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

export function getState() {
    return _state;
}

// Settings setters
export function setRefreshRate(val) {
    _state.REFRESH_RATE = val;
}
export function setDefaultWidgetWidth(val) {
    _state.DEFAULT_WIDGET_WIDTH = val;
}
export function setDefaultWidgetHeight(val) {
    _state.DEFAULT_WIDGET_HEIGHT = val;
}
export function setDecimalPrecision(val) {
    _state.DECIMAL_PRECISION = val;
}
export function setPriceType(val) {
    _state.PRICE_TYPE = val;
}

// Runtime state setters
export function setIsRestoring(val) {
    _state.isRestoring = val;
}
export function setIsFetching(val) {
    _state.isFetching = val;
}
export function setRefreshInterval(val) {
    _state.refreshInterval = val;
}
export function setGrid(val) {
    _state.grid = val;
}

// Data cache setters
export function setLastQuotes(val) {
    Object.assign(_state.lastQuotes, val);
}
export function clearLastQuotes() {
    Object.keys(_state.lastQuotes).forEach(k => delete _state.lastQuotes[k]);
}

// Symbol list management
export function addSymbol(symbol) {
    if (!_state.symbolList.includes(symbol)) _state.symbolList.push(symbol);
}
export function removeSymbol(symbol) {
    _state.symbolList = _state.symbolList.filter(s => s !== symbol);
}
export function clearSymbolList() {
    _state.symbolList = [];
}

export const state = _state;
