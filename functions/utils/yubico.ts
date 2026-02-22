import { timingSafeEqual, base64ToBytes } from "./crypto";

export async function verifyYubicoOTP(
    otp: string,
    clientId: string,
    secretKeyB64: string
): Promise<boolean> {
    const nonce = crypto.randomUUID().replace(/-/g, "").slice(0, 40);
    const params: Record<string, string> = { id: clientId, otp, nonce };

    params['h'] = await generateYubicoSignature(params, secretKeyB64);

    const response = await fetch(`https://api.yubico.com/wsapi/2.0/verify?${new URLSearchParams(params)}`);
    if (!response.ok) throw new Error(`Yubico API responded with status ${response.status}`);

    const responseParams = parseYubicoResponse(await response.text());

    if (
        responseParams['status'] !== 'OK' ||
        responseParams['nonce'] !== nonce ||
        responseParams['otp'] !== otp
    ) return false;

    const receivedSignature = responseParams['h'];
    if (!receivedSignature) return false;

    delete responseParams['h'];
    const expectedSignature = await generateYubicoSignature(responseParams, secretKeyB64);

    return timingSafeEqual(receivedSignature, expectedSignature);
}

async function generateYubicoSignature(
    params: Record<string, string>,
    secretKeyB64: string
): Promise<string> {
    const message = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
    const keyBytes = base64ToBytes(secretKeyB64);

    const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));

    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function parseYubicoResponse(text: string): Record<string, string> {
    return Object.fromEntries(
        text.trim().split(/\r?\n/).map(line => {
            const [key, ...rest] = line.split('=');
            return [key.trim(), rest.join('=').trim()];
        })
    );
}
