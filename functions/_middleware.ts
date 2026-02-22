import { Env } from "./utils/env";
import { verifySessionCookie } from "./utils/session";

const PUBLIC_ASSETS = ["/app.js", "/style.css", "/favicon.ico"];

export const onRequest: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);

    if (PUBLIC_ASSETS.includes(url.pathname)) {
        return context.next();
    }

    const cookieHeader = context.request.headers.get("Cookie");

    const sessionSecret = context.env.SESSION_SECRET || "";
    const sessionData = await verifySessionCookie(
        cookieHeader,
        sessionSecret,
        context.env.DB
    );

    // Authenticated user
    if (sessionData) {
        context.data.yubikeyId = sessionData.yubikeyId;

        if (url.pathname === "/login" || url.pathname === "/api/auth") {
            return Response.redirect(new URL("/", context.request.url).toString(), 302);
        }
        return context.next();
    }

    // Allow access to login page and the new auth API endpoint
    if (url.pathname === "/login" || url.pathname === "/api/auth") {
        return context.next();
    }

    // Redirect unauthenticated users to login
    return Response.redirect(new URL("/login", context.request.url).toString(), 302);
};
