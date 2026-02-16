
import { prisma } from './db';
import { WorkLog } from '@/types';

export async function getWorkLogs(teamId?: string): Promise<WorkLog[]> {
    const whereClause = (teamId && teamId !== 'ALL') ? { teamId } : {};

    const logs = await prisma.workLog.findMany({
        where: whereClause,
        include: {
            participations: true,
            team: { select: { name: true } }
        },
        orderBy: { date: 'desc' }
    });

    return logs.map((log: any) => ({
        ...log,

        status: (log.status as 'Normal' | 'Waiting' | 'Cancelled') || 'Normal',
        worker_ids: (log as any).participations.map((p: any) => p.workerId),
        start_time: log.start_time || undefined,
        notes: log.notes || undefined,

        waiting_rate: log.waiting_rate || undefined,
        manualWaitingBillable: log.manualWaitingBillable || undefined,
        manualWaitingWorkerPay: log.manualWaitingWorkerPay || undefined,

        isTaxFree: log.isTaxFree || false,
        isPaidFromClient: log.isPaidFromClient || false,

        clientId: log.clientId
    }));
}

export async function addWorkLog(log: Omit<WorkLog, 'id'>): Promise<WorkLog> {
    const newLog = await prisma.workLog.create({
        data: {
            date: log.date,
            start_time: log.start_time,
            volume_type: log.volume_type,
            quantity: log.quantity,
            status: log.status,
            waiting_rate: log.waiting_rate,
            manualWaitingBillable: log.manualWaitingBillable,
            manualWaitingWorkerPay: log.manualWaitingWorkerPay,
            unit_price: log.unit_price,
            total_payment_to_workers: log.total_payment_to_workers,
            billable_amount: log.billable_amount,
            is_billed: log.is_billed,
            is_paid_to_workers: log.is_paid_to_workers,

            isTaxFree: (log as any).isTaxFree || false,
            isPaidFromClient: (log as any).isPaidFromClient || false,

            notes: log.notes,
            clientId: log.clientId,
            teamId: log.teamId,
            participations: {
                create: log.worker_ids.map(workerId => ({
                    workerId
                }))
            }
        } as any,
        include: { participations: true }
    });

    return {
        ...newLog,
        worker_ids: (newLog as any).participations.map((p: any) => p.workerId),

        status: (newLog.status as 'Normal' | 'Waiting' | 'Cancelled') || 'Normal',
        start_time: newLog.start_time || undefined,
        notes: newLog.notes || undefined,
        waiting_rate: newLog.waiting_rate || undefined,
        manualWaitingBillable: newLog.manualWaitingBillable || undefined,
        manualWaitingWorkerPay: newLog.manualWaitingWorkerPay || undefined,

        isTaxFree: (newLog as any).isTaxFree || false,
        isPaidFromClient: (newLog as any).isPaidFromClient || false,

        clientId: newLog.clientId
    };
}

export async function updateWorkLog(id: string, updates: Partial<WorkLog>): Promise<WorkLog | null> {
    try {
        const { worker_ids, ...data } = updates;

        // Transaction handling for updating relations if worker_ids changed
        if (worker_ids) {
            // Delete existing participations and create new ones
            // Functionally equivalent to "set"
            return await prisma.$transaction(async (tx) => {
                await tx.workLogParticipation.deleteMany({
                    where: { workLogId: id }
                });

                // Create new ones
                await tx.workLogParticipation.createMany({
                    data: worker_ids.map(wid => ({
                        workLogId: id,
                        workerId: wid
                    }))
                });

                const updated = await tx.workLog.update({
                    where: { id },
                    data: { ...data } as any,
                    include: { participations: true }
                });

                return {
                    ...updated,
                    worker_ids: (updated as any).participations.map((p: any) => p.workerId),

                    status: (updated.status as 'Normal' | 'Waiting' | 'Cancelled') || 'Normal',
                    start_time: updated.start_time || undefined,
                    notes: updated.notes || undefined,
                    waiting_rate: updated.waiting_rate || undefined,
                    manualWaitingBillable: updated.manualWaitingBillable || undefined,
                    manualWaitingWorkerPay: updated.manualWaitingWorkerPay || undefined,

                    isTaxFree: (updated as any).isTaxFree || false,
                    isPaidFromClient: (updated as any).isPaidFromClient || false,

                    clientId: updated.clientId
                };
            });
        } else {
            const updated = await prisma.workLog.update({
                where: { id },
                data: data as any,
                include: { participations: true }
            });

            return {
                ...updated,
                worker_ids: (updated as any).participations.map((p: any) => p.workerId),

                status: (updated.status as 'Normal' | 'Waiting' | 'Cancelled') || 'Normal',
                start_time: updated.start_time || undefined,
                notes: updated.notes || undefined,
                waiting_rate: updated.waiting_rate || undefined,
                manualWaitingBillable: updated.manualWaitingBillable || undefined,
                manualWaitingWorkerPay: updated.manualWaitingWorkerPay || undefined,

                isTaxFree: (updated as any).isTaxFree || false,
                isPaidFromClient: (updated as any).isPaidFromClient || false,

                clientId: updated.clientId
            };
        }
    } catch {
        return null;
    }
}

export async function deleteWorkLog(id: string): Promise<boolean> {
    try {
        await prisma.workLog.delete({
            where: { id }
        });
        return true;
    } catch {
        return false;
    }
}
