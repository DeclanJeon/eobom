import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/today/:path*",
    "/entries/:path*",
    "/reviews/:path*",
    "/together/:path*",
    "/me/:path*",
    "/api/entries/:path*",
    "/api/reviews/:path*",
    "/api/together/:path*",
    "/api/me/:path*",
    "/api/export/:path*",
  ],
};
