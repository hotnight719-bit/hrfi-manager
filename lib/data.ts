import fs from 'fs';
import path from 'path';
import { Client } from '@/types';

// In a real app, this would be a database call.
// For now, we read from the JSON file.

export async function getClients(): Promise<Client[]> {
    // Use process.cwd() to correctly locate the file in Next.js runtime
    // Adjust path based on where 'web/data' ends up relative to execution
    // In dev, process.cwd() is usually the project root (web/)

    const filePath = path.join(process.cwd(), 'data', 'clients.json');

    try {
        const fileContents = await fs.promises.readFile(filePath, 'utf8');
        const data = JSON.parse(fileContents);

        // Transform raw JSON to Client interface if needed
        // The JSON structure matches our interface mostly, but let's be safe
        return data.map((item: Client) => ({
            id: item.id,
            name: item.name,
            // address: item.address, // Address might not exist on Client type? Check types.ts
            // manager: item.manager,
            rates: item.rates || [],
            // Default to 0 commission if not present
            commission_rate: 0,
            fee_per_person: 0 // Add missing property
        }));
    } catch (error) {
        console.error("Failed to load clients:", error);
        return [];
    }
}

export async function getClientById(id: string): Promise<Client | undefined> {
    const clients = await getClients();
    return clients.find(c => c.id === id);
}
