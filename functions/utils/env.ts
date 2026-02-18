export interface Env {
    YUBICO_CLIENT_ID?: string;
    YUBICO_SECRET_KEY?: string;
    ALLOWED_YUBIKEY_ID?: string;
    SESSION_SECRET?: string;
    DB: D1Database;
}

