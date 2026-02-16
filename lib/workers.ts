
import { prisma } from './db';
import { Worker } from '@/types';

export async function getWorkers(teamId?: string): Promise<Worker[]> {
    const whereClause = (teamId && teamId !== 'ALL') ? { teamId } : {};

    const workers = await prisma.worker.findMany({
        where: whereClause,
        include: { team: { select: { name: true } } },
        orderBy: { name: 'asc' }
    });

    return workers as Worker[];
}

export async function addWorker(worker: Omit<Worker, 'id'>): Promise<Worker> {
    const newWorker = await prisma.worker.create({
        data: {
            name: worker.name,
            phone: worker.phone,
            resident_id_front: worker.resident_id_front,
            address: worker.address,
            bank_name: worker.bank_name,
            bank_account: worker.bank_account,
            residentRegistrationNumber: worker.residentRegistrationNumber,
            bankBookImage: worker.bankBookImage,
            skill_level: worker.skill_level,
            contract_type: worker.contract_type,
            notes: worker.notes,
            status: worker.status,
            teamId: worker.teamId,
        }
    });
    return newWorker as Worker;
}

export async function updateWorker(id: string, updates: Partial<Worker>): Promise<Worker | null> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { team, createdAt, updatedAt, ...cleanUpdates } = updates;

        const updated = await prisma.worker.update({
            where: { id },
            data: cleanUpdates
        });
        return updated as Worker;
    } catch (e) {
        return null;
    }
}

export async function deleteWorker(id: string): Promise<boolean> {
    try {
        await prisma.worker.delete({
            where: { id }
        });
        return true;
    } catch {
        return false;
    }
}
