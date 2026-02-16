'use client';

import { useState, useMemo } from 'react';
import { Client, Worker, WorkLog } from '@/types';
import { Calendar, Filter } from 'lucide-react';
import SettlementExportButton from './SettlementExportButton';
import WorkerSettlementModal from './WorkerSettlementModal';
import ClientSettlementModal from './ClientSettlementModal';
import { useTeam } from '@/context/TeamContext';

interface SettlementDashboardProps {
    initialClients: Client[];
    initialWorkers: Worker[];
    initialLogs: WorkLog[];
}

type CycleType = 'Monthly' | 'Weekly' | 'Daily';

export default function SettlementDashboard({ initialClients, initialWorkers, initialLogs }: SettlementDashboardProps) {
    const [cycle, setCycle] = useState<CycleType>('Monthly');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedWeek, setSelectedWeek] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        // Simple week calculation for default
        const oneJan = new Date(year, 0, 1);
        const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
        const week = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
        return `${year}-W${week.toString().padStart(2, '0')}`;
    });
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
    const [activeTab, setActiveTab] = useState<'summary' | 'client' | 'worker'>('summary');
    const [selectedWorkerForReport, setSelectedWorkerForReport] = useState<Worker | null>(null);
    const [selectedClientForReport, setSelectedClientForReport] = useState<Client | null>(null);

    const { selectedTeam } = useTeam();
    const isGlobalMode = selectedTeam?.id === 'ALL';

    // Helper: Get start and end date of a week string (YYYY-Www)
    const getWeekRange = (weekStr: string) => {
        const [yearStr, weekPart] = weekStr.split('-W');
        const year = parseInt(yearStr);
        const week = parseInt(weekPart);

        const simple = new Date(year, 0, 1 + (week - 1) * 7);
        const dow = simple.getDay();
        const ISOweekStart = simple;
        if (dow <= 4)
            ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
        else
            ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());

        const start = new Date(ISOweekStart);
        const end = new Date(ISOweekStart);
        end.setDate(end.getDate() + 6);

        return {
            start: start.toISOString().slice(0, 10),
            end: end.toISOString().slice(0, 10)
        };
    };

    const filteredLogs = useMemo(() => {
        return initialLogs.filter(log => {
            if (cycle === 'Monthly') {
                return log.date.startsWith(selectedMonth);
            } else if (cycle === 'Weekly') {
                if (!selectedWeek) return false;
                const { start, end } = getWeekRange(selectedWeek);
                return log.date >= start && log.date <= end;
            } else {
                return log.date === selectedDate;
            }
        });
    }, [initialLogs, cycle, selectedMonth, selectedWeek, selectedDate]);

    // --- Aggregation Logic ---

    // 1. Total Metrics
    const totalPayout = filteredLogs.reduce((sum, log) => sum + log.total_payment_to_workers, 0); // Cost

    const totalBilled = filteredLogs.reduce((sum, log) => sum + (log.billable_amount || 0), 0);
    const totalSupply = Math.round(totalBilled / 1.1); // Approx
    const totalMargin = totalSupply - totalPayout;

    // 2. Client Breakdown
    const clientStats = useMemo(() => {
        return initialClients.map(client => {
            const activeLogs = filteredLogs.filter(l => l.clientId === client.id);
            const billed = activeLogs.reduce((sum, l) => sum + (l.billable_amount || 0), 0);
            const collected = activeLogs.filter(l => l.isPaidFromClient).reduce((sum, l) => sum + (l.billable_amount || 0), 0);
            const receivables = billed - collected;
            const count = activeLogs.length;
            return { ...client, billed, collected, receivables, count };
        }).filter(c => c.count > 0);
    }, [initialClients, filteredLogs]);

    // 3. Worker Breakdown
    const workerStats = useMemo(() => {
        return initialWorkers.map(worker => {
            const activeLogs = filteredLogs.filter(l => l.worker_ids.includes(worker.id));
            const earned = activeLogs.reduce((sum, l) => sum + l.unit_price, 0);
            const count = activeLogs.length;
            return { ...worker, earned, count };
        }).filter(w => w.count > 0);
    }, [initialWorkers, filteredLogs]);


    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <Filter className="w-5 h-5 text-gray-500" />
                        <select
                            value={cycle}
                            onChange={(e) => setCycle(e.target.value as CycleType)}
                            className="border rounded px-3 py-2 font-medium bg-gray-50 text-gray-900"
                        >
                            <option value="Monthly">월간 정산</option>
                            <option value="Weekly">주간 정산</option>
                            <option value="Daily">일간 정산</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        {cycle === 'Monthly' && (
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="border rounded px-3 py-2"
                            />
                        )}
                        {cycle === 'Weekly' && (
                            <input
                                type="week"
                                value={selectedWeek}
                                onChange={(e) => setSelectedWeek(e.target.value)}
                                className="border rounded px-3 py-2"
                            />
                        )}
                        {cycle === 'Daily' && (
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="border rounded px-3 py-2"
                            />
                        )}
                    </div>
                </div>

                {/* Right controls: Filters & Export */}
                <div className="flex flex-col md:flex-row items-end gap-3">
                    <div className="flex space-x-2">
                        <button
                            className={`px-4 py-2 rounded font-medium transition-colors ${activeTab === 'summary' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            onClick={() => setActiveTab('summary')}
                        >
                            요약
                        </button>
                        <button
                            className={`px-4 py-2 rounded font-medium transition-colors ${activeTab === 'client' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            onClick={() => setActiveTab('client')}
                        >
                            거래처별
                        </button>
                        <button
                            className={`px-4 py-2 rounded font-medium transition-colors ${activeTab === 'worker' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            onClick={() => setActiveTab('worker')}
                        >
                            인력별
                        </button>
                    </div>

                    <SettlementExportButton
                        targetId="settlement-report-area"
                        fileName={`settlement-${cycle}-${cycle === 'Monthly' ? selectedMonth : (cycle === 'Weekly' ? selectedWeek : selectedDate)}`}
                    />
                </div>
            </div>

            {/* Export Area Wrapper */}
            <div id="settlement-report-area" className="p-1 bg-gray-50">

                {/* Summary View */}
                {activeTab === 'summary' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                            <h3 className="text-gray-500 text-sm font-uppercase">총 청구액 (매출)</h3>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{totalBilled.toLocaleString()}원</p>
                            <p className="text-sm text-gray-400 mt-1">부가세 포함</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                            <h3 className="text-gray-500 text-sm font-uppercase">총 노무비 (매입)</h3>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{totalPayout.toLocaleString()}원</p>
                            <p className="text-sm text-gray-400 mt-1">인건비 지급 총액</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                            <h3 className="text-gray-500 text-sm font-uppercase">예상 마진 (수익)</h3>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{totalMargin.toLocaleString()}원</p>
                            <p className="text-sm text-gray-400 mt-1">공급가액 - 노무비</p>
                        </div>
                    </div>
                )}

                {/* Client Table */}
                {(activeTab === 'client' || activeTab === 'summary') && (
                    <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="font-bold text-lg text-gray-800">거래처별 정산/수금 현황</h3>
                            <p className="text-sm text-gray-500">
                                {cycle === 'Monthly' ? `${selectedMonth}월` : (cycle === 'Weekly' ? `${selectedWeek}주차` : selectedDate)} 기준
                            </p>
                            <p className="text-xs text-blue-600 mt-1">* 목록의 이름을 클릭하면 매출 정산서를 발급할 수 있습니다.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200" style={{ borderCollapse: 'collapse', width: '100%' }}>
                                <thead style={{ backgroundColor: '#f9fafb' }}>
                                    <tr>
                                        {isGlobalMode && <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>팀</th>}
                                        <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>거래처명</th>
                                        <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>작업 횟수</th>
                                        <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>청구 금액 (매출)</th>
                                        <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>수금액 (완료)</th>
                                        <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>미수금 (잔액)</th>
                                    </tr>
                                </thead>
                                <tbody style={{ backgroundColor: '#ffffff' }}>
                                    {clientStats.map(c => (
                                        <tr
                                            key={c.id}
                                            onClick={() => setSelectedClientForReport(c)}
                                            className="hover:bg-blue-50 cursor-pointer transition-colors"
                                            title="클릭하여 매출 정산서 보기"
                                            style={{ borderBottom: '1px solid #e5e7eb' }}
                                        >
                                            <td style={{ padding: '16px 24px', whiteSpace: 'nowrap', fontWeight: '500', color: '#111827' }}>
                                                <span className="underline decoration-dotted underline-offset-4 text-blue-600" style={{ color: '#2563eb' }}>{c.name}</span>
                                            </td>
                                            <td style={{ padding: '16px 24px', whiteSpace: 'nowrap', color: '#6b7280' }}>{c.count}건</td>
                                            <td style={{ padding: '16px 24px', whiteSpace: 'nowrap', textAlign: 'right', fontWeight: '500', color: '#111827' }}>{c.billed.toLocaleString()}원</td>
                                            <td style={{ padding: '16px 24px', whiteSpace: 'nowrap', textAlign: 'right', fontWeight: '500', color: '#16a34a' }}>{c.collected.toLocaleString()}원</td>
                                            <td style={{ padding: '16px 24px', whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 'bold', color: c.receivables > 0 ? '#ef4444' : '#9ca3af' }}>{c.receivables.toLocaleString()}원</td>
                                        </tr>
                                    ))}
                                    {clientStats.length === 0 && <tr><td colSpan={isGlobalMode ? 6 : 5} className="px-6 py-4 text-center text-gray-500">데이터가 없습니다.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Worker Table */}
                {(activeTab === 'worker' || activeTab === 'summary') && (
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="font-bold text-lg text-gray-800">인력별 정산 현황</h3>
                            <p className="text-sm text-gray-500">
                                {cycle === 'Monthly' ? `${selectedMonth}월` : (cycle === 'Weekly' ? `${selectedWeek}주차` : selectedDate)} 기준
                            </p>
                            <p className="text-xs text-blue-600 mt-1">* 목록의 이름을 클릭하면 정산서를 발급할 수 있습니다.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200" style={{ borderCollapse: 'collapse', width: '100%' }}>
                                <thead style={{ backgroundColor: '#f9fafb' }}>
                                    <tr>
                                        {isGlobalMode && <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>팀</th>}
                                        <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>성명</th>
                                        <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>작업 횟수</th>
                                        <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>지급액</th>
                                    </tr>
                                </thead>
                                <tbody style={{ backgroundColor: '#ffffff' }}>
                                    {workerStats.map(w => (
                                        <tr
                                            key={w.id}
                                            onClick={() => setSelectedWorkerForReport(w)}
                                            className="hover:bg-blue-50 cursor-pointer transition-colors"
                                            title="클릭하여 정산서 보기"
                                            style={{ borderBottom: '1px solid #e5e7eb' }}
                                        >
                                            {isGlobalMode && (
                                                <td style={{ padding: '16px 24px', whiteSpace: 'nowrap', color: '#6b7280', fontSize: '0.875rem' }}>
                                                    <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs">{w.team?.name || '-'}</span>
                                                </td>
                                            )}
                                            <td style={{ padding: '16px 24px', whiteSpace: 'nowrap', fontWeight: '500', color: '#111827' }}>
                                                <span className="underline decoration-dotted underline-offset-4 text-blue-600" style={{ color: '#2563eb' }}>{w.name}</span>
                                            </td>
                                            <td style={{ padding: '16px 24px', whiteSpace: 'nowrap', color: '#6b7280' }}>{w.count}건</td>
                                            <td style={{ padding: '16px 24px', whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>{w.earned.toLocaleString()}원</td>
                                        </tr>
                                    ))}
                                    {workerStats.length === 0 && <tr><td colSpan={isGlobalMode ? 4 : 3} className="px-6 py-4 text-center text-gray-500">데이터가 없습니다.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Settlement Report Modal */}
            {selectedWorkerForReport && (
                <WorkerSettlementModal
                    worker={selectedWorkerForReport}
                    clients={initialClients}
                    logs={initialLogs}
                    initialDateRange={
                        cycle === 'Monthly'
                            ? { start: selectedMonth + '-01', end: selectedMonth + '-31' } // Approximate
                            : cycle === 'Weekly' ? getWeekRange(selectedWeek)
                                : { start: selectedDate, end: selectedDate }
                    }
                    onClose={() => setSelectedWorkerForReport(null)}
                />
            )}

            {/* Client Billing Report Modal */}
            {selectedClientForReport && (
                <ClientSettlementModal
                    client={selectedClientForReport}
                    logs={initialLogs}
                    initialDateRange={
                        cycle === 'Monthly'
                            ? { start: selectedMonth + '-01', end: selectedMonth + '-31' }
                            : cycle === 'Weekly' ? getWeekRange(selectedWeek)
                                : { start: selectedDate, end: selectedDate }
                    }
                    onClose={() => setSelectedClientForReport(null)}
                />
            )}
        </div>
    );
}
