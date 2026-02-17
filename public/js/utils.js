const HTML_ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
};

const HTML_UNESCAPE_MAP = Object.fromEntries(
    Object.entries(HTML_ESCAPE_MAP).map(([k, v]) => [v, k])
);

export function escapeHtml(text) {
    if (!text) return text;
    return text.replace(/[&<>"']/g, m => HTML_ESCAPE_MAP[m]);
}

export function unescapeHtml(text) {
    if (!text) return text;
    return text.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, m => HTML_UNESCAPE_MAP[m]);
}

export function getAppropriateDecimals(price, userPrecision) {
    const abs = Math.abs(price);

    if (abs > 0 && abs < 0.01) return Math.max(6, userPrecision);
    if (abs < 0.1) return Math.max(5, userPrecision);
    if (abs < 1) return Math.max(4, userPrecision);
    if (abs < 10) return Math.max(3, userPrecision);

    return userPrecision;
}

export function formatNumber(num, maxDecimals) {
    const fixed = num.toFixed(maxDecimals);
    const parsed = parseFloat(fixed);

    if (Number.isInteger(parsed) || (parsed * 10) % 1 === 0) {
        return parsed.toFixed(2);
    }

    return parsed.toString();
}

export function formatPrice(price, userPrecision) {
    return formatNumber(price, getAppropriateDecimals(price, userPrecision));
}
