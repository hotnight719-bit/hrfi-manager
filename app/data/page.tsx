import { getClients } from '@/lib/clients';
import DataManagement from '@/components/DataManagement';
import CloseButton from '@/components/CloseButton';

export default async function DataPage() {
    const clients = await getClients();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">데이터 관리</h1>
                <CloseButton />
            </div>

            <DataManagement initialClients={clients} />
        </div>
    );
}
