export function escapeHtml(text) {
    if (!text) return text;
    return text.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m];
    });
}

export function unescapeHtml(text) {
    if (!text) return text;
    const map = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#039;': "'"
    };
    return text.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, function(m) { return map[m]; });
}

export function getAppropriateDecimals(price, userPrecision) {
    const absPrice = Math.abs(price);

    if (absPrice > 0 && absPrice < 0.01) {
        return Math.max(6, userPrecision);
    } else if (absPrice < 0.1) {
        return Math.max(5, userPrecision);
    } else if (absPrice < 1) {
        return Math.max(4, userPrecision);
    } else if (absPrice < 10) {
        return Math.max(3, userPrecision);
    }

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
    const decimals = getAppropriateDecimals(price, userPrecision);
    return formatNumber(price, decimals);
}
