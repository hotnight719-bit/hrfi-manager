
'use server';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

// Import server-side logic from libs (which we migrated)
import { addWorker, updateWorker, deleteWorker } from '@/lib/workers';
import { addClient, updateClient, deleteClient, updateClientRates } from '@/lib/clients';
import { addWorkLog, updateWorkLog, deleteWorkLog } from '@/lib/work_logs';
import { Worker, Client, WorkLog, Team } from '@/types';
import { createTeam, updateTeam, deleteTeam } from '@/lib/teams';
import { revalidatePath } from 'next/cache';

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        console.log("Authenticate action called");
        console.log("FormData:", Object.fromEntries(formData));
        await signIn('credentials', formData);
        console.log("SignIn successful (should redirect)");
    } catch (error) {
        console.log("Authenticate error:", error);
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}

export async function logout() {
    await signOut();
}

export async function registerUser(prevState: string | undefined, formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!username || !password || !confirmPassword) {
        return "모든 필드를 입력해주세요.";
    }

    if (password !== confirmPassword) {
        return "비밀번호가 일치하지 않습니다.";
    }

    if (password.length < 6) {
        return "비밀번호는 6자 이상이어야 합니다.";
    }

    try {
        // Build the prisma client inside here or import it. 
        // We need to import prisma and bcrypt.
        // But app/actions.ts is 'use server'.
        // We should move the logic to lib/auth.ts or similar if possible, 
        // but for now let's implement validation here and call a lib function 
        // or just do it here if we import prisma/bcrypt.

        // Let's use a helper in lib/utils or similar to keep actions clean?
        // Or just import prisma here. We already import prisma-related stuff via libs.

        // Wait, we need to check if user exists.
        const existingUser = await prisma.user.findUnique({
            where: { username }
        });

        if (existingUser) {
            return "이미 존재하는 아이디입니다.";
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
            },
        });

        return "success";
    } catch (error) {
        console.error("Registration error:", error);
        return "회원가입 중 오류가 발생했습니다.";
    }
}

// Team Actions
export async function createTeamAction(name: string): Promise<Team> {
    try {
        const newTeam = await createTeam(name);
        return newTeam;
    } catch (error) {
        console.error(`[Action] createTeamAction failed:`, error);
        throw error;
    }
}

export async function updateTeamAction(id: string, name: string): Promise<Team> {
    const updated = await updateTeam(id, name);
    revalidatePath('/');
    return updated;
}

export async function deleteTeamAction(id: string) {
    await deleteTeam(id);
    revalidatePath('/');
}

// Worker Actions
export async function createWorkerAction(data: Omit<Worker, 'id'>) {
    const newWorker = await addWorker(data);
    revalidatePath('/hr');
    return newWorker;
}

export async function updateWorkerAction(id: string, data: Partial<Worker>) {
    const updated = await updateWorker(id, data);
    revalidatePath('/hr');
    return updated;
}

export async function deleteWorkerAction(id: string) {
    await deleteWorker(id);
    revalidatePath('/hr');
}

// Client Actions
export async function createClientAction(data: Omit<Client, 'id'>) {
    const newClient = await addClient(data);
    revalidatePath('/clients');
    return newClient;
}

export async function updateClientAction(id: string, data: Partial<Client>) {
    const updated = await updateClient(id, data);
    revalidatePath('/clients');
    return updated;
}

export async function deleteClientAction(id: string) {
    await deleteClient(id);
    revalidatePath('/clients');
}

// WorkLog Actions
export async function createWorkLogAction(data: Omit<WorkLog, 'id'>) {
    const newLog = await addWorkLog(data);
    revalidatePath('/dispatch');
    revalidatePath('/settlement');
    return newLog;
}

export async function updateWorkLogAction(id: string, data: Partial<WorkLog>) {
    const updated = await updateWorkLog(id, data);
    revalidatePath('/dispatch');
    revalidatePath('/settlement');
    return updated;
}


export async function deleteWorkLogAction(id: string) {
    await deleteWorkLog(id);
    revalidatePath('/dispatch');
    revalidatePath('/settlement');
}

export async function updateClientRatesAction(updates: { clientId: string; rateId: string; newRate: number }[]) {
    await updateClientRates(updates);
    revalidatePath('/clients');
    revalidatePath('/dispatch');
    revalidatePath('/settlement');
    revalidatePath('/data');
}
