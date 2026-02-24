import { Env } from "./utils/env";
import { verifySessionCookie } from "./utils/session";

export const onRequest: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    const path = url.pathname;

    const sessionSecret = context.env.SESSION_SECRET;
    if (!sessionSecret) {
        return new Response(JSON.stringify({ error: "Server misconfiguration: Missing Session Secret" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    const sessionData = await verifySessionCookie(
        context.request.headers.get("Cookie"),
        sessionSecret,
        context.env.DB
    );

    const isAuthRoute = ["/login", "/signup", "/api/auth", "/api/signup"].includes(path);
    const isApiRoute = path.startsWith("/api/");

    // --- AUTHENTICATED USER FLOW ---
    if (sessionData) {
        context.data.yubikeyId = sessionData.yubikeyId;

        if (isAuthRoute) {
            return Response.redirect(new URL("/", context.request.url).toString(), 302);
        }

        return context.next();
    }

    // --- UNAUTHENTICATED USER FLOW ---
    if (isAuthRoute) {
        return context.next();
    }

    if (isApiRoute) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    return Response.redirect(new URL("/login", context.request.url).toString(), 302);
};
