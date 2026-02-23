import { Env } from "./env";
import { verifyYubicoOTP } from "./yubico";
import { createSignedSessionValue, SESSION_MAX_AGE_SECONDS } from "./session";

export const YUBIKEY_ID_LENGTH = 12;
export const YUBIKEY_OTP_LENGTH = 44;

export function extractYubikeyId(otp: string): string | null {
    if (!otp || otp.length !== YUBIKEY_OTP_LENGTH) return null;
    return otp.substring(0, YUBIKEY_ID_LENGTH).toLowerCase();
}

export async function verifyOtp(env: Env, otp: string): Promise<boolean> {
    const { YUBICO_CLIENT_ID, YUBICO_SECRET_KEY } = env;
    if (!YUBICO_CLIENT_ID || !YUBICO_SECRET_KEY) {
        throw new Error("Server configuration error: Missing Yubico credentials");
    }
    return await verifyYubicoOTP(otp, YUBICO_CLIENT_ID, YUBICO_SECRET_KEY);
}

export async function checkYubikeyExists(db: any, yubikeyId: string): Promise<boolean> {
    const result = await db.prepare(
        "SELECT yubikey_id FROM yubikeys WHERE yubikey_id = ?"
    ).bind(yubikeyId).first();
    return !!result;
}

export async function registerYubikey(db: any, yubikeyId: string): Promise<void> {
    await db.prepare(
        "INSERT INTO yubikeys (yubikey_id) VALUES (?)"
    ).bind(yubikeyId).run();
}

export async function createSessionResponse(env: Env, yubikeyId: string): Promise<Response> {
    if (!env.SESSION_SECRET) {
        throw new Error("Server configuration error: Missing session secret");
    }
    const sessionCookieValue = await createSignedSessionValue(env.SESSION_SECRET, yubikeyId);

    return new Response(null, {
        status: 303,
        headers: {
            "Location": "/",
            "Set-Cookie": `auth_session=${sessionCookieValue}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}`
        }
    });
}
