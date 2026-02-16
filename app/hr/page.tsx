// import { Worker } from '@/types';
// We'll import server actions or API calls here. For now, mocking or using the lib directly if server component?
// Since we want interactivity (add/edit), we might need API routes.
// But we can import the server logic in a server component and pass data to client component.
// Let's make this page a Server Component that fetches data, and passes it to a Client Component <WorkerList>.

// Wait, the file is 'use client' so it's a client component. 
// Standard Next.js 13+ way: Page (Server) -> Component (Client).

// Let's refactor. This file will be the Client Component part or we make page.tsx server.
// Let's make page.tsx a Server Component.


import { getWorkers } from '@/lib/workers';
import WorkerList from '@/components/WorkerList';
import CloseButton from '@/components/CloseButton';
import { cookies } from 'next/headers';


import { getTeam } from '@/lib/teams';

export default async function HRPage() {
    const cookieStore = await cookies();
    const teamId = cookieStore.get('teamId')?.value;
    const workers = await getWorkers(teamId);
    const team = teamId ? await getTeam(teamId) : null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                    인사 관리 (HR) {team ? `- ${team.name}` : ''}
                </h1>
                <CloseButton />
            </div>

            <WorkerList initialWorkers={workers} />
        </div>
    );
}
