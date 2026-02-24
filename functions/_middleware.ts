import { Env } from "./utils/env";
import { verifySessionCookie } from "./utils/session";

const PUBLIC_ASSETS = ["/app.js", "/style.css", "/favicon.ico"];

export const onRequest: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    const path = url.pathname;

    if (PUBLIC_ASSETS.includes(path) || path.startsWith("/js/")) {
        return context.next();
    }

    const cookieHeader = context.request.headers.get("Cookie");
    const sessionSecret = context.env.SESSION_SECRET || "";
    const sessionData = await verifySessionCookie(
        cookieHeader,
        sessionSecret,
        context.env.DB
    );

    const isAuthRoute = ["/login", "/api/auth", "/signup", "/api/signup"].includes(path);
    const isApiRoute = path.startsWith("/api/");

    // --- AUTHENTICATED USER FLOW ---
    if (sessionData) {
        context.data.yubikeyId = sessionData.yubikeyId;

        if (isAuthRoute) {
            return Response.redirect(new URL("/", context.request.url).toString(), 302);
        }

        if (path === "/" || isApiRoute) {
            return context.next();
        }

        return Response.redirect(new URL("/", context.request.url).toString(), 302);
    }

    // --- UNAUTHENTICATED USER FLOW ---
    if (isAuthRoute) {
        return context.next();
    }

    return Response.redirect(new URL("/login", context.request.url).toString(), 302);
};
