import { signHmacSha256, timingSafeEqual, base64ToBase64Url, base64UrlToBase64 } from "./crypto";

export const SESSION_DURATION_MS = 3600 * 1000; // 1 hour
export const SESSION_MAX_AGE_SECONDS = 3600;

export async function createSignedSessionValue(secret: string, yubikeyId: string): Promise<string> {
    const expiration = Date.now() + SESSION_DURATION_MS;
    const data = JSON.stringify({ status: "valid", yubikeyId, exp: expiration });
    const encodedData = base64ToBase64Url(btoa(data));
    const signature = base64ToBase64Url(await signHmacSha256(encodedData, secret));

    return `${encodedData}.${signature}`;
}

export async function verifySessionCookie(
    cookieHeader: string | null,
    secret: string,
    db: any
): Promise<{ yubikeyId: string } | null> {
    if (!cookieHeader || !secret) return null;

    const match = cookieHeader.match(/(?:^|; )\s*auth_session=([^;]+)/);
    if (!match) return null;

    const [encodedDataUrl, signatureUrl] = match[1].split('.');
    if (!encodedDataUrl || !signatureUrl) return null;

    const expectedSignature = base64ToBase64Url(await signHmacSha256(encodedDataUrl, secret));
    if (!timingSafeEqual(signatureUrl, expectedSignature)) return null;

    try {
        const data = JSON.parse(atob(base64UrlToBase64(encodedDataUrl)));

        if (Date.now() > data.exp) return null;
        if (!data.yubikeyId) return null;

        const dbResult = await db.prepare(
            "SELECT yubikey_id FROM yubikeys WHERE yubikey_id = ?"
        ).bind(data.yubikeyId.toLowerCase()).first();

        if (!dbResult) {
            return null;
        }

        return { yubikeyId: data.yubikeyId };
    } catch {
        return null;
    }
}
