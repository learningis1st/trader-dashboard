interface Env {
    YUBICO_CLIENT_ID: string;
    YUBICO_SECRET_KEY: string;
    ALLOWED_YUBIKEY_ID: string;
    SESSION_SECRET: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);

    const isStaticAsset = /\.(ico|png|jpg|jpeg|css|js|svg)$/.test(url.pathname);
    if (isStaticAsset) {
        return context.next();
    }

    const cookieHeader = context.request.headers.get("Cookie");

    // --- CASE 1: Check for existing valid session ---
    const isValidSession = await verifySessionCookie(
        cookieHeader,
        context.env.SESSION_SECRET,
        context.env.ALLOWED_YUBIKEY_ID
    );

    if (isValidSession) {
        // If the user is already logged in, redirect them away from login pages
        if (url.pathname === "/login" || url.pathname === "/auth") {
            return Response.redirect(new URL("/", context.request.url).toString(), 302);
        }
        return context.next();
    }

    // --- CASE 2: Handling the Form Submission (POST /auth) ---
    if (url.pathname === "/auth" && context.request.method === "POST") {
        const formData = await context.request.formData();
        const otp = formData.get("otp") as string;

        const createErrorUrl = (msg: string) => {
            const u = new URL("/login", context.request.url);
            u.searchParams.set("error", msg);
            return u.toString();
        };

        if (!otp) {
            return Response.redirect(createErrorUrl("No OTP provided"), 302);
        }

        // Validate Yubikey ID (First 12 chars)
        const yubikeyId = otp.substring(0, 12).toLowerCase();
        const allowedIds = (context.env.ALLOWED_YUBIKEY_ID || "")
            .split(',')
            .map(id => id.trim().toLowerCase()); // Normalize config to lowercase

        if (!allowedIds.includes(yubikeyId)) {
            return Response.redirect(createErrorUrl("Unauthorized Device ID"), 302);
        }

        try {
            // Validate OTP with Yubico API
            const isValid = await verifyYubicoOTP(otp, context.env.YUBICO_CLIENT_ID, context.env.YUBICO_SECRET_KEY);

            if (isValid) {
                // Generate a SIGNED session cookie
                const sessionCookieValue = await createSignedSessionValue(context.env.SESSION_SECRET, yubikeyId);

                const headers = new Headers();
                headers.append("Location", "/");
                headers.append("Set-Cookie", `auth_session=${sessionCookieValue}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`);

                return new Response(null, {
                    status: 303,
                    headers: headers
                });
            } else {
                return Response.redirect(createErrorUrl("Invalid OTP"), 302);
            }
        } catch (error) {
            console.error("Auth System Error:", error);
            return Response.redirect(createErrorUrl("Verification Service Unavailable. Try again."), 302);
        }
    }

    // --- CASE 3: User is not logged in ---

    if (url.pathname === "/login") {
        return context.next();
    }

    // Redirect to login if not authenticated
    return Response.redirect(new URL("/login", context.request.url).toString(), 302);
};

// --- SESSION MANAGEMENT LOGIC ---

async function createSignedSessionValue(secret: string, yubikeyId: string): Promise<string> {
    const expiration = Date.now() + 3600 * 1000; // 1 hour from now
    const data = JSON.stringify({ status: "valid", yubikeyId: yubikeyId, exp: expiration });

    const encodedData = base64ToBase64Url(btoa(data));

    const signature = await signData(encodedData, secret); // signData returns standard Base64
    const encodedSignature = base64ToBase64Url(signature);

    return `${encodedData}.${encodedSignature}`;
}

async function verifySessionCookie(cookieHeader: string | null, secret: string, allowedYubiKeys: string): Promise<boolean> {
    if (!cookieHeader) return false;

    // Extract auth_session value
    const match = cookieHeader.match(/(?:^|; )\s*auth_session=([^;]+)/);
    if (!match) return false;

    const token = match[1];
    const [encodedDataUrl, signatureUrl] = token.split('.');

    if (!encodedDataUrl || !signatureUrl) return false;

    // 1. Verify Signature
    // Note: We verify the signature *against the data string exactly as it appeared in the cookie*
    const expectedSignatureBase64 = await signData(encodedDataUrl, secret);
    const expectedSignatureUrl = base64ToBase64Url(expectedSignatureBase64);

    // Use constant-time comparison
    if (!timingSafeStringEqual(signatureUrl, expectedSignatureUrl)) return false;

    // 2. Verify Expiration & Authorization
    try {
        // Decode Base64URL to JSON
        const jsonString = atob(base64UrlToBase64(encodedDataUrl));
        const data = JSON.parse(jsonString);

        if (Date.now() > data.exp) return false;

        // Check if the session's YubiKey ID is still in the allowed list
        const allowedIds = (allowedYubiKeys || "")
            .split(',')
            .map(id => id.trim().toLowerCase());

        if (!data.yubikeyId || !allowedIds.includes(data.yubikeyId.toLowerCase())) {
            return false;
        }

        return true;
    } catch (e) {
        return false;
    }
}

async function signData(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(data);

    const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, messageData);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function base64ToBase64Url(base64: string): string {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBase64(base64url: string): string {
    // Add padding back
    let padded = base64url;
    while (padded.length % 4 !== 0) {
        padded += '=';
    }
    return padded.replace(/-/g, '+').replace(/_/g, '/');
}


// --- YUBICO VALIDATION LOGIC ---

async function verifyYubicoOTP(otp: string, clientId: string, secretKeyB64: string): Promise<boolean> {
    const nonce = crypto.randomUUID().replace(/-/g, "").slice(0, 40);

    const params: Record<string, string> = {
        id: clientId,
        otp: otp,
        nonce: nonce
    };

    const requestSignature = await generateSignature(params, secretKeyB64);
    params['h'] = requestSignature;

    const searchParams = new URLSearchParams(params);
    const apiUrl = `https://api.yubico.com/wsapi/2.0/verify?${searchParams.toString()}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
        throw new Error(`Yubico API responded with status ${response.status}`);
    }

    const text = await response.text();
    const responseParams = parseResponse(text);

    if (responseParams['status'] !== 'OK') {
        return false;
    }

    if (responseParams['nonce'] !== nonce) return false;
    if (responseParams['otp'] !== otp) return false;

    const receivedSignature = responseParams['h'];
    if (!receivedSignature) return false;

    delete responseParams['h'];

    const expectedSignature = await generateSignature(responseParams, secretKeyB64);
    return timingSafeStringEqual(receivedSignature, expectedSignature);
}

async function generateSignature(params: Record<string, string>, secretKeyB64: string): Promise<string> {
    const keys = Object.keys(params).sort();
    const message = keys.map(key => `${key}=${params[key]}`).join('&');

    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const keyBytes = base64ToBytes(secretKeyB64);

    const key = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "HMAC", hash: "SHA-1" },
        false,
        ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", key, data);
    return btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
}

function parseResponse(text: string): Record<string, string> {
    const lines = text.trim().split(/\r?\n/);
    const result: Record<string, string> = {};

    for (const line of lines) {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            result[key] = value;
        }
    }
    return result;
}

function base64ToBytes(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function timingSafeStringEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
        mismatch |= (a.charCodeAt(i) ^ b.charCodeAt(i));
    }
    return mismatch === 0;
}