export const onRequest: PagesFunction = async ({ next, request }) => {
    const response = await next();

    if (response.status === 404) {
        const url = new URL("/", request.url);
        return Response.redirect(url.toString(), 302);
    }

    return response;
};
