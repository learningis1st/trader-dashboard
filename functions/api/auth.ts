import { Env } from "../utils/env";
import { extractYubikeyId, verifyOtp, checkYubikeyExists, createSessionResponse } from "../utils/auth-service";

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const formData = await context.request.formData();
    const otp = formData.get("otp")?.toString();

    const redirectWithError = (msg: string) => {
        const errorUrl = new URL("/login", context.request.url);
        errorUrl.searchParams.set("error", msg);
        return Response.redirect(errorUrl.toString(), 302);
    };

    if (!otp) return redirectWithError("No OTP provided");

    const yubikeyId = extractYubikeyId(otp);
    if (!yubikeyId) return redirectWithError("Invalid OTP length");

    try {
        const exists = await checkYubikeyExists(context.env.DB, yubikeyId);

        if (!exists) {
            const signupUrl = new URL("/signup", context.request.url);
            signupUrl.searchParams.set("error", "YubiKey not recognized. Please register it here.");
            return Response.redirect(signupUrl.toString(), 302);
        }

        const isValid = await verifyOtp(context.env, otp);
        if (!isValid) return redirectWithError("Invalid OTP");

        return await createSessionResponse(context.env, yubikeyId);
    } catch (error: any) {
        console.error("Auth System Error:", error);
        const errorMsg = error.message.includes("configuration")
            ? error.message
            : "Verification Service Unavailable. Try again.";
        return redirectWithError(errorMsg);
    }
};
