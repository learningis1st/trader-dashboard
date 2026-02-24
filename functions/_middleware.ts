import { Env } from "./utils/env";
import { verifySessionCookie } from "./utils/session";

const PUBLIC_ASSETS = ["/app.js", "/style.css", "/favicon.ico"];

export const onRequest: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);

    let response: Response;

    if (PUBLIC_ASSETS.includes(url.pathname)) {
        response = await context.next();
    } else {
        const cookieHeader = context.request.headers.get("Cookie");
        const sessionSecret = context.env.SESSION_SECRET || "";
        const sessionData = await verifySessionCookie(
            cookieHeader,
            sessionSecret,
            context.env.DB
        );

        const isAuthRoute = ["/login", "/api/auth", "/signup", "/api/signup"].includes(url.pathname);

        if (sessionData) {
            context.data.yubikeyId = sessionData.yubikeyId;
            if (isAuthRoute) {
                response = Response.redirect(new URL("/", context.request.url).toString(), 302);
            } else {
                response = await context.next();
            }
        } else if (isAuthRoute) {
            response = await context.next();
        } else {
            response = Response.redirect(new URL("/login", context.request.url).toString(), 302);
        }
    }

    if (response.status === 404) {
        return Response.redirect(new URL("/", context.request.url).toString(), 302);
    }

    return response;
};
