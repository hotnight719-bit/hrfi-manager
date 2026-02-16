
import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;

            // Protected routes (add more as needed)
            // For now, protect everything except login and public pages if any
            // But maybe we want to allow public home page?
            // "All routes except /login and /api/auth" was the plan.
            // But we have public landing page? 
            // Let's assume dashboard-like usage: all internal pages protected.
            // The Next-Auth example protects specific paths.
            // Given the implementation plan: "protect all routes except /login and /api/auth".

            const isOnLoginPage = nextUrl.pathname.startsWith('/login');
            const isOnRegisterPage = nextUrl.pathname.startsWith('/register');

            if (isOnLoginPage || isOnRegisterPage) {
                if (isLoggedIn) {
                    if (nextUrl.pathname === '/') {
                        return true;
                    }
                    return Response.redirect(new URL('/', nextUrl));
                }
                return true;
            }

            // Exclude public assets (images, etc) is handled by middleware matcher
            // But we should be careful about API routes if they are needed for login?
            // NextAuth handles /api/auth internally.

            if (!isLoggedIn) {
                return false; // Redirect to login for ALL other pages
            }

            return true;
        },
    },
    providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
