import { Env } from "../utils/env";
import { verifyYubicoOTP } from "../utils/yubico";
import { createSignedSessionValue, SESSION_MAX_AGE_SECONDS } from "../utils/session";

const YUBIKEY_ID_LENGTH = 12;
const YUBIKEY_OTP_LENGTH = 44;

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const formData = await context.request.formData();
    const otp = formData.get("otp")?.toString();

    const redirectWithError = (msg: string) => {
        const errorUrl = new URL("/login", context.request.url);
        errorUrl.searchParams.set("error", msg);
        return Response.redirect(errorUrl.toString(), 302);
    };

    if (!otp) return redirectWithError("No OTP provided");
    if (otp.length !== YUBIKEY_OTP_LENGTH) return redirectWithError("Invalid OTP length");

    const yubikeyId = otp.substring(0, YUBIKEY_ID_LENGTH).toLowerCase();

    const dbResult = await context.env.DB.prepare(
        "SELECT yubikey_id FROM yubikeys WHERE yubikey_id = ?"
    ).bind(yubikeyId).first();

    if (!dbResult) {
        const signupUrl = new URL("/signup", context.request.url);
        signupUrl.searchParams.set("error", "YubiKey not recognized. Please register it here.");
        return Response.redirect(signupUrl.toString(), 302);
    }

    try {
        const { YUBICO_CLIENT_ID, YUBICO_SECRET_KEY, SESSION_SECRET } = context.env;
        if (!YUBICO_CLIENT_ID || !YUBICO_SECRET_KEY || !SESSION_SECRET) {
            return redirectWithError("Server configuration error");
        }

        const isValid = await verifyYubicoOTP(otp, YUBICO_CLIENT_ID, YUBICO_SECRET_KEY);
        if (!isValid) return redirectWithError("Invalid OTP");

        const sessionCookieValue = await createSignedSessionValue(SESSION_SECRET, yubikeyId);

        return new Response(null, {
            status: 303,
            headers: {
                "Location": "/",
                "Set-Cookie": `auth_session=${sessionCookieValue}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}`
            }
        });
    } catch (error) {
        console.error("Auth System Error:", error);
        return redirectWithError("Verification Service Unavailable. Try again.");
    }
};
