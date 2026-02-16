
import { getClients } from '@/lib/clients';
import { getWorkers } from '@/lib/workers';
import { getWorkLogs } from '@/lib/work_logs';
import DispatchManager from '@/components/DispatchManager';
import CloseButton from '@/components/CloseButton';
import { cookies } from 'next/headers';


import { getTeam } from '@/lib/teams';

export default async function DispatchPage() {
    const cookieStore = await cookies();
    const teamId = cookieStore.get('teamId')?.value;

    const clients = await getClients(teamId);
    const workers = await getWorkers(teamId);
    const workLogs = await getWorkLogs(teamId);
    const team = teamId ? await getTeam(teamId) : null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                    배차/작업일지 관리 {team ? `- ${team.name}` : ''}
                </h1>
                <CloseButton />
            </div>

            <DispatchManager
                initialClients={clients}
                initialWorkers={workers}
                initialLogs={workLogs}
            />
        </div>
    );
}
