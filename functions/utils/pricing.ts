const cleanFloat = (num: number) => Number(num.toFixed(6));

export function calculateDisplayQuote(
    quoteData: any,
    priceType: string,
    isOvernight: boolean
) {
    const quote = quoteData.quote || {};
    const extended = quoteData.extended;
    const regular = quoteData.regular;

    let price = 0, change = 0, changePct = 0;
    const useExtended = isOvernight && extended && regular;

    if (useExtended) {
        price = extended.mark || extended.lastPrice || 0;
        const prevClose = regular.regularMarketLastPrice || price;
        change = price - prevClose;
        changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;
    } else {
        if (priceType === 'lastPrice') {
            price = quote.lastPrice || 0;
            change = quote.netChange || 0;
            changePct = quote.netPercentChange || quote.futurePercentChange || 0;
        } else {
            price = quote.mark || quote.lastPrice || 0;
            change = quote.markChange || quote.netChange || 0;
            changePct = quote.markPercentChange || quote.futurePercentChange || quote.netPercentChange || 0;
        }
    }

    return {
        price: cleanFloat(price),
        change: cleanFloat(change),
        changePct: cleanFloat(changePct)
    };
}
