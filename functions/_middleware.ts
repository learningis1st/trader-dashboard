import { Env } from "./utils/env";
import { verifySessionCookie } from "./utils/session";

const PUBLIC_ASSETS = ["/app.js", "/style.css", "/favicon.ico"];

const API_ROUTES: Record<string, string[]> = {
    "/api/auth": ["POST"],
    "/api/signup": ["POST"],
    "/api/me": ["GET"],
    "/api/quote": ["POST"],
    "/api/layout": ["GET", "POST"]
};

export const onRequest: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    const path = url.pathname;
    const method = context.request.method;

    if (PUBLIC_ASSETS.includes(path) || path.startsWith("/js/")) {
        return context.next();
    }

    if (path.startsWith("/api/")) {
        const allowedMethods = API_ROUTES[path];

        if (!allowedMethods) {
            return new Response(JSON.stringify({ error: "Not Found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        if (!allowedMethods.includes(method)) {
            return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
                status: 405,
                headers: { "Content-Type": "application/json", "Allow": allowedMethods.join(", ") }
            });
        }
    }

    const cookieHeader = context.request.headers.get("Cookie");
    const sessionSecret = context.env.SESSION_SECRET || "";
    const sessionData = await verifySessionCookie(
        cookieHeader,
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

        if (path === "/" || isApiRoute) {
            return context.next();
        }

        return Response.redirect(new URL("/", context.request.url).toString(), 302);
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
