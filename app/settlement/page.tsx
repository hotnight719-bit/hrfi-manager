
import { getClients } from '@/lib/clients';
import { getWorkers } from '@/lib/workers';
import { getWorkLogs } from '@/lib/work_logs';
import SettlementDashboard from '@/components/SettlementDashboard';
import CloseButton from '@/components/CloseButton';
import { cookies } from 'next/headers';


import { getTeam } from '@/lib/teams';

export default async function SettlementPage() {
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
                    정산 및 재무 관리 {team ? `- ${team.name}` : ''}
                </h1>
                <CloseButton />
            </div>

            <SettlementDashboard
                initialClients={clients}
                initialWorkers={workers}
                initialLogs={workLogs}
            />
        </div>
    );
}
