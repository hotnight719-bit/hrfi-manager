
import { Client, Worker, WorkLog } from '@/types';
import { Copy, FileText, CheckCircle } from 'lucide-react';

interface ScheduleBriefingProps {
    date: string;
    logs: WorkLog[];
    clients: Client[];
    workers: Worker[];
}

export default function ScheduleBriefing({ date, logs, clients, workers }: ScheduleBriefingProps) {
    // Sort logs by time
    const sortedLogs = [...logs].sort((a, b) => (a.start_time || '00:00').localeCompare(b.start_time || '00:00'));

    const formatTime = (time: string) => {
        if (!time) return '미정';
        const [h, m] = time.split(':');
        return `${h}시${m !== '00' ? m + '분' : ''}`;
    };

    const getWorkerNames = (workerIds: string[]) => {
        return workerIds.map(id => workers.find(w => w.id === id)?.name || '미정').join(', ');
    };

    // Generate Text for Clipboard
    const generateText = () => {
        const parts = [`${date.slice(5)} 배차 스케줄\n`];

        sortedLogs.forEach(log => {
            const client = clients.find(c => c.id === log.clientId);
            const time = formatTime(log.start_time || '');
            const workerNames = getWorkerNames(log.worker_ids);

            parts.push(`${client?.name} ${time}`);
            parts.push(` - ${workerNames || '인원 미정'}\n`);
        });

        parts.push(`------------------------------`);
        parts.push(`- 팀장은 팀원들 스케쥴 확인!!`);
        parts.push(`- 작업 15분전 현장도착!!`);
        parts.push(`- 팀장은 작업 1시간전 팀원 출발 확인!!`);

        return parts.join('\n');
    };

    const handleCopy = () => {
        const text = generateText();
        navigator.clipboard.writeText(text);
        alert('스케줄 텍스트가 복사되었습니다!');
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-xl font-bold flex items-center text-gray-800">
                    <FileText className="w-6 h-6 mr-2 text-indigo-600" />
                    {date} 배차 스케줄
                </h2>
                <button
                    onClick={handleCopy}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                >
                    <Copy className="w-4 h-4 mr-2" />
                    텍스트 복사
                </button>
            </div>

            <div className="space-y-6">
                {sortedLogs.map((log) => {
                    const client = clients.find(c => c.id === log.clientId);
                    const time = formatTime(log.start_time || '');
                    const workerNames = getWorkerNames(log.worker_ids);

                    return (
                        <div key={log.id} className="relative pl-4 border-l-4 border-indigo-200">
                            <div className="font-bold text-lg text-gray-900">
                                {client?.name} <span className="text-indigo-600 ml-1">{time}</span>
                            </div>
                            <div className="text-gray-700 mt-1 font-medium">
                                - {workerNames || <span className="text-gray-400">인원 미정</span>}
                            </div>
                        </div>
                    );
                })}
                {sortedLogs.length === 0 && (
                    <p className="text-gray-500 text-center py-10">등록된 일정이 없습니다.</p>
                )}
            </div>

            {sortedLogs.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-600 space-y-2 bg-gray-50 p-4 rounded">
                    <div className="flex items-center font-bold text-red-600">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        팀장은 팀원들 스케쥴 확인!!
                    </div>
                    <div className="flex items-center font-bold text-red-600">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        작업 15분전 현장도착!!
                    </div>
                    <div className="flex items-center font-bold text-red-600">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        팀장은 작업 1시간전 팀원 출발 확인!!
                    </div>
                </div>
            )}
        </div>
    );
}
