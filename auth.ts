
import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';

async function getUser(username: string): Promise<User | null> {
    try {
        const user = await prisma.user.findUnique({ where: { username } });
        return user;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                console.log("Authorize callback called");
                const parsedCredentials = z
                    .object({ username: z.string(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { username, password } = parsedCredentials.data;
                    console.log("Fetching user:", username);
                    const user = await getUser(username);
                    if (!user) {
                        console.log("User not found");
                        return null;
                    }

                    console.log("Comparing password...");
                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (passwordsMatch) {
                        console.log("Password match!");
                        return user;
                    }
                }

                console.log('Invalid credentials or parsing failed');
                return null;
            },
        }),
    ],
    debug: true, // Enable debugging to see logs in Netlify
});
