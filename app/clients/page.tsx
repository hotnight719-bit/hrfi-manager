
import { getClients } from '@/lib/clients';
import { getTeam } from '@/lib/teams';
import ClientList from '@/components/ClientList';
import CloseButton from '@/components/CloseButton';
import { cookies } from 'next/headers';

export default async function ClientsPage() {
    const cookieStore = await cookies();
    const teamId = cookieStore.get('teamId')?.value;

    // In a real app with auth, we'd get teamId from session or context, 
    // but here we might rely on the cookie set by TeamContext (if we implemented that syncing)
    // OR, since this is a server component, we just fetch ALL clients for now if teamId is missing,
    // or ideally handle it better.
    // However, TeamContext is client-side. Server components don't easily see client context state unless passed via cookies.
    // For now, let's pass undefined to getClients and let it return all (or handle empty).
    // The ClientList component does client-side filtering based on selectedTeam from Context!
    // So fetching ALL clients here is actually consistent with our current architecture 
    // where we filter on the client side.

    const clients = await getClients(teamId);
    const team = teamId ? await getTeam(teamId) : null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                    거래처 관리 {team ? `- ${team.name}` : ''}
                </h1>
                <CloseButton />
            </div>

            <ClientList initialClients={clients} />
        </div>
    );
}
