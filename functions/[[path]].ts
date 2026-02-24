export const onRequest: PagesFunction = async (context) => {
    return Response.redirect(new URL("/", context.request.url).toString(), 302);
};
