export interface QuoteData {
    quote?: {
        lastPrice?: number;
        netChange?: number;
        netPercentChange?: number;
        mark?: number;
        markChange?: number;
        markPercentChange?: number;
        futurePercentChange?: number;
    };
    extended?: {
        lastPrice?: number;
        mark?: number;
    };
    regular?: {
        regularMarketLastPrice?: number;
    };
    assetMainType?: "EQUITY" | "OPTION" | "FUTURE" | "FOREX" | "BOND";
}

export interface MarketScheduleData {
    option?: Record<string, ProductSchedule>;
    bond?: Record<string, ProductSchedule>;
    [key: string]: Record<string, ProductSchedule> | undefined;
}

export interface ProductSchedule {
    isOpen?: boolean;
    sessionHours?: {
        preMarket?: SessionHour[];
        regularMarket?: SessionHour[];
        postMarket?: SessionHour[];
    };
}

export interface SessionHour {
    start: string;
    end: string;
}

export interface ScheduleCache {
    date: string;
    data: MarketScheduleData;
}

export interface MarketStatus {
    EQUITY: boolean;
    EQUITY_OVERNIGHT: boolean;
    FUTURE: boolean;
    FOREX: boolean;
    OPTION: boolean;
    BOND: boolean;
}
