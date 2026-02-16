
import { prisma } from './db';
import { Team } from '@prisma/client';

export async function getTeams(): Promise<Team[]> {
    return prisma.team.findMany({
        orderBy: { createdAt: 'asc' }
    });
}

export async function createTeam(name: string): Promise<Team> {
    return prisma.team.create({
        data: { name }
    });
}

export async function getTeam(id: string): Promise<Team | null> {
    return prisma.team.findUnique({
        where: { id }
    });
}

export async function updateTeam(id: string, name: string): Promise<Team> {
    return prisma.team.update({
        where: { id },
        data: { name }
    });
}

export async function deleteTeam(id: string): Promise<void> {
    await prisma.team.delete({
        where: { id }
    });
}
