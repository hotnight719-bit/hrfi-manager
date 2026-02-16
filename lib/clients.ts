
import { prisma } from './db';
import { Client, Rate } from '@/types';

export async function getClients(teamId?: string): Promise<Client[]> {
    const whereClause = (teamId && teamId !== 'ALL') ? { teamId } : {};

    const clients = await prisma.client.findMany({
        where: whereClause,
        include: { team: { select: { name: true } } },
        orderBy: { name: 'asc' }
    });

    return clients.map(client => ({
        ...client,
        rates: JSON.parse(client.rates) as Rate[],

        commission_type: client.commission_type as 'Percent' | 'PerPerson',
        contact_info: client.contact_info || undefined,
        manager: client.manager || undefined,
        address: client.address || undefined,
        commission_rate: client.commission_rate || undefined,
        fee_per_person: client.fee_per_person || undefined,
        businessRegistrationImages: client.businessRegistrationImages ? JSON.parse(client.businessRegistrationImages) : [],
        businessOwnerNames: client.businessOwnerNames ? JSON.parse(client.businessOwnerNames) : [],
        businessRegistrationNumbers: client.businessRegistrationNumbers ? JSON.parse(client.businessRegistrationNumbers) : [],
        taxInvoiceEmail: client.taxInvoiceEmail || undefined,
        payType: (client.payType as 'INDIVIDUAL' | 'TOTAL') || 'INDIVIDUAL',
    }));
}

export async function addClient(client: Omit<Client, 'id'>): Promise<Client> {
    const newClient = await prisma.client.create({
        data: {
            name: client.name,
            address: client.address,
            manager: client.manager,
            contact_info: client.contact_info,
            rates: JSON.stringify(client.rates),
            commission_type: client.commission_type,
            commission_rate: client.commission_rate,
            fee_per_person: client.fee_per_person,
            businessRegistrationImages: client.businessRegistrationImages ? JSON.stringify(client.businessRegistrationImages) : null,
            businessOwnerNames: client.businessOwnerNames ? JSON.stringify(client.businessOwnerNames) : null,
            businessRegistrationNumbers: client.businessRegistrationNumbers ? JSON.stringify(client.businessRegistrationNumbers) : null,
            taxInvoiceEmail: client.taxInvoiceEmail,
            payType: client.payType || 'INDIVIDUAL',
            teamId: client.teamId,
        }
    });

    return {
        ...newClient,

        rates: JSON.parse(newClient.rates) as Rate[],
        commission_type: newClient.commission_type as 'Percent' | 'PerPerson',
        address: newClient.address || undefined,
        manager: newClient.manager || undefined,
        contact_info: newClient.contact_info || undefined,
        commission_rate: newClient.commission_rate || undefined,
        fee_per_person: newClient.fee_per_person || undefined,
        businessRegistrationImages: newClient.businessRegistrationImages ? JSON.parse(newClient.businessRegistrationImages) : [],
        businessOwnerNames: newClient.businessOwnerNames ? JSON.parse(newClient.businessOwnerNames) : [],
        businessRegistrationNumbers: newClient.businessRegistrationNumbers ? JSON.parse(newClient.businessRegistrationNumbers) : [],
        taxInvoiceEmail: newClient.taxInvoiceEmail || undefined,
        payType: (newClient.payType as 'INDIVIDUAL' | 'TOTAL') || 'INDIVIDUAL',
    };
}

export async function updateClient(id: string, updates: Partial<Client>): Promise<Client | null> {
    try {
        const { rates, businessRegistrationImages, ...otherData } = updates;

        const updateData: any = { ...otherData };

        if (rates) {
            updateData.rates = JSON.stringify(rates);
        }

        if (businessRegistrationImages !== undefined) {
            updateData.businessRegistrationImages = businessRegistrationImages ? JSON.stringify(businessRegistrationImages) : null;
        }

        if (updates.businessOwnerNames !== undefined) {
            updateData.businessOwnerNames = updates.businessOwnerNames ? JSON.stringify(updates.businessOwnerNames) : null;
        }

        if (updates.businessRegistrationNumbers !== undefined) {
            updateData.businessRegistrationNumbers = updates.businessRegistrationNumbers ? JSON.stringify(updates.businessRegistrationNumbers) : null;
        }

        const updated = await prisma.client.update({
            where: { id },
            data: updateData
        });

        return {
            ...updated,
            rates: JSON.parse(updated.rates) as Rate[],
            businessRegistrationImages: updated.businessRegistrationImages ? JSON.parse(updated.businessRegistrationImages) : [],
            commission_type: updated.commission_type as 'Percent' | 'PerPerson',
            address: updated.address || undefined,
            manager: updated.manager || undefined,
            contact_info: updated.contact_info || undefined,
            commission_rate: updated.commission_rate || undefined,
            fee_per_person: updated.fee_per_person || undefined,
            businessOwnerNames: updated.businessOwnerNames ? JSON.parse(updated.businessOwnerNames) : [],
            businessRegistrationNumbers: updated.businessRegistrationNumbers ? JSON.parse(updated.businessRegistrationNumbers) : [],
            taxInvoiceEmail: updated.taxInvoiceEmail || undefined,
            payType: (updated.payType as 'INDIVIDUAL' | 'TOTAL') || 'INDIVIDUAL',
            teamId: updated.teamId,
        };
    } catch {
        return null;
    }
}

export async function deleteClient(id: string): Promise<boolean> {
    try {
        await prisma.client.delete({
            where: { id }
        });
        return true;
    } catch {
        return false;
    }
}

export async function updateClientRates(updates: { clientId: string; rateId: string; newRate: number }[]): Promise<void> {
    // This is inefficient with Prisma + JSON types, as we need to read, update JSON, and write back.
    // Better to fetch all relevant clients first.

    // Group by client
    const clientUpdates: Record<string, { rateId: string; newRate: number }[]> = {};
    updates.forEach(u => {
        if (!clientUpdates[u.clientId]) clientUpdates[u.clientId] = [];
        clientUpdates[u.clientId].push(u);
    });

    for (const clientId of Object.keys(clientUpdates)) {
        const client = await prisma.client.findUnique({ where: { id: clientId } });
        if (!client) continue;

        let rates = JSON.parse(client.rates) as Rate[];
        let hasChanges = false;

        clientUpdates[clientId].forEach(u => {
            const rateIndex = rates.findIndex(r => r.id === u.rateId);
            if (rateIndex !== -1) {
                rates[rateIndex].rate_per_person = u.newRate;
                hasChanges = true;
            }
        });

        if (hasChanges) {
            await prisma.client.update({
                where: { id: clientId },
                data: { rates: JSON.stringify(rates) }
            });
        }
    }
}
