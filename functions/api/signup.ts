import { Env } from "../utils/env";
import { extractYubikeyId, verifyOtp, checkYubikeyExists, registerYubikey, createSessionResponse } from "../utils/auth-service";

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const formData = await context.request.formData();
    const otp = formData.get("otp")?.toString();

    const redirectWithError = (msg: string) => {
        const errorUrl = new URL("/signup", context.request.url);
        errorUrl.searchParams.set("error", msg);
        return Response.redirect(errorUrl.toString(), 302);
    };

    if (!otp) return redirectWithError("No OTP provided");

    const yubikeyId = extractYubikeyId(otp);
    if (!yubikeyId) return redirectWithError("Invalid OTP length");

    try {
        const isValid = await verifyOtp(context.env, otp);
        if (!isValid) return redirectWithError("Invalid OTP");

        // Safety check to ensure it wasn't registered between loading the page and posting
        const exists = await checkYubikeyExists(context.env.DB, yubikeyId);
        if (exists) return redirectWithError("This YubiKey is already registered");

        await registerYubikey(context.env.DB, yubikeyId);

        return await createSessionResponse(context.env, yubikeyId);
    } catch (error) {
        console.error("Signup System Error:", error);
        const message = error instanceof Error ? error.message : "";
        const errorMsg = message.includes("configuration")
            ? message
            : "Registration Service Unavailable. Try again.";
        return redirectWithError(errorMsg);
    }
};
