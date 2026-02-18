'use client';

import { useState, useMemo } from 'react';
import { Client, Worker, WorkLog } from '@/types';
import { Calendar, Filter } from 'lucide-react';
import SettlementExportButton from './SettlementExportButton';
import WorkerSettlementModal from './WorkerSettlementModal';
import ClientSettlementModal from './ClientSettlementModal';
import { useTeam } from '@/context/TeamContext';
import * as XLSX from 'xlsx';

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
    const [activeTab, setActiveTab] = useState<'summary' | 'client' | 'worker' | 'unpaid'>('summary');
    const [selectedWorkerForReport, setSelectedWorkerForReport] = useState<Worker | null>(null);
    const [selectedClientForReport, setSelectedClientForReport] = useState<Client | null>(null);

    // Popup State
    const [activeClientPopup, setActiveClientPopup] = useState<{ client: Client, x: number, y: number } | null>(null);

    // Unpaid Selection State
    const [selectedUnpaidClientIds, setSelectedUnpaidClientIds] = useState<Set<string>>(new Set());

    const toggleUnpaidClientSelection = (clientId: string) => {
        const newSet = new Set(selectedUnpaidClientIds);
        if (newSet.has(clientId)) {
            newSet.delete(clientId);
        } else {
            newSet.add(clientId);
        }
        setSelectedUnpaidClientIds(newSet);
    };

    const handleMarkAsPaid = async () => {
        if (selectedUnpaidClientIds.size === 0) return;
        if (!confirm(`선택한 ${selectedUnpaidClientIds.size}개 거래처의 미수금을 '수금 완료' 처리하시겠습니까?`)) return;

        try {
            // Import action dynamically or assume it's available via props/import
            // Since this is a client component, we need to import the server action.
            // But we can't import server action directly if not passed down? 
            // flexible enough in Next.js 14. 
            // Let's assume we import strict action.
            const { markClientLogsAsPaidAction } = await import('@/app/actions');
            await markClientLogsAsPaidAction(Array.from(selectedUnpaidClientIds));
            setSelectedUnpaidClientIds(new Set());
            alert('수금 처리가 완료되었습니다.');
        } catch (error) {
            console.error(error);
            alert('처리 중 오류가 발생했습니다.');
        }
    };

    const handleClientClick = (e: React.MouseEvent, client: Client) => {
        e.stopPropagation(); // Prevent row click or other bubbles
        const rect = e.currentTarget.getBoundingClientRect();
        // Toggle if clicking same client, otherwise open new
        if (activeClientPopup?.client.id === client.id) {
            setActiveClientPopup(null);
        } else {
            setActiveClientPopup({
                client,
                x: rect.left + window.scrollX,
                y: rect.bottom + window.scrollY
            });
        }
    };

    const closePopup = () => {
        setActiveClientPopup(null);
        setActiveWorkerPopup(null);
    };

    const [activeWorkerPopup, setActiveWorkerPopup] = useState<{ worker: Worker, x: number, y: number } | null>(null);

    const handleWorkerClick = (e: React.MouseEvent, worker: Worker) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        if (activeWorkerPopup?.worker.id === worker.id) {
            setActiveWorkerPopup(null);
        } else {
            setActiveWorkerPopup({
                worker,
                x: rect.left + window.scrollX,
                y: rect.bottom + window.scrollY
            });
        }
    };



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
    // Calculate Total Payout dynamically to include VAT for business workers
    // Start with raw total_payment_to_workers from DB
    // But we need to add VAT if applicable. 
    // Since we don't store VAT separately in WorkLog, we must re-derive it based on Worker ID.
    const totalPayout = filteredLogs.reduce((sum, log) => {
        let logCost = log.total_payment_to_workers;

        // Add VAT for business workers if participation details exist
        // Note: total_payment_to_workers in DB excludes VAT mostly.
        if (log.participations && log.participations.length > 0) {
            log.participations.forEach(p => {
                const worker = initialWorkers.find(w => w.id === p.workerId);
                if (worker && worker.businessRegistrationNumber) {
                    logCost += Math.floor(p.payment * 0.1);
                }
            });
        } else {
            // Fallback if no participations (e.g. legacy or just headcount)
            // If we can identify workers from worker_ids?
            log.worker_ids.forEach(wid => {
                const worker = initialWorkers.find(w => w.id === wid);
                if (worker && worker.businessRegistrationNumber) {
                    // Estimate portion? 
                    // If equal split:
                    const portion = log.total_payment_to_workers / log.worker_ids.length;
                    logCost += Math.floor(portion * 0.1);
                }
            });
        }
        return sum + logCost;
    }, 0);

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
            const subTotal = activeLogs.reduce((sum, l) => {
                if (l.participations && l.participations.length > 0) {
                    const p = l.participations.find(p => p.workerId === worker.id);
                    return sum + (p ? p.payment : 0);
                }
                return sum + l.unit_price;
            }, 0);

            // Apply VAT if business
            const hasBusiness = !!worker.businessRegistrationNumber && worker.businessRegistrationNumber.trim() !== '';
            const vat = hasBusiness ? Math.floor(subTotal * 0.1) : 0;
            const earned = subTotal + vat;

            const count = activeLogs.length;
            return { ...worker, earned, count };
        }).filter(w => w.count > 0);
    }, [initialWorkers, filteredLogs]);

    // 4. Unpaid Stats (Across ALL time, or just current filter? Usually Unpaid is "Total Outstanding")
    // But filters might be useful. Let's stick to current filter for consistency, 
    // OR create a separate "unpaidLogs" derived from 'initialLogs' (ignoring date)
    // if the user wants to see "Current Status of Everything".
    // Requirement: "미정산 내역 대시보드". Usually implies "Current Outstanding".
    // Let's us 'initialLogs' (which is all fetched logs) for calculating TOTAL unpaid.
    // NOTE: 'initialLogs' depends on what the server passes. If server passes all, we are good.
    const unpaidStats = useMemo(() => {
        // Client Unpaid (Receivables)
        const clientUnpaid = initialClients.map(client => {
            const logs = initialLogs.filter(l => l.clientId === client.id && !l.isPaidFromClient);
            const amount = logs.reduce((sum, l) => sum + (l.billable_amount || 0), 0);
            return { ...client, unpaidAmount: amount, count: logs.length };
        }).filter(c => c.unpaidAmount > 0);

        // Worker Unpaid (Payables)
        const workerUnpaid = initialWorkers.map(worker => {
            // Find logs where this worker worked AND is_paid_to_workers is false
            const logs = initialLogs.filter(l => l.worker_ids.includes(worker.id) && !l.is_paid_to_workers);
            // Calculate detailed pay. 
            // Note: worker_ids is just virtual in WorkLog type in this file context? 
            // We need to check actual participation measurement if possible, but 'unit_price' in WorkLog 
            // is "per person" payment.
            // Wait, 'unit_price' is stored on WorkLog.
            // If custom payment was used (participations), we need to check that.
            // But 'initialLogs' might not have deep 'participations' data if not included?
            // checking 'types/index.ts', WorkLog has 'participations'.
            // In 'SettlementDashboard', we are using `initialLogs`.
            // Let's assume we can sum up `unit_price` for now, or refine if `participations` is available.
            // For now, let's use `l.unit_price` which is the "default" or "per person" rate. 
            // If custom pay is implemented, `l.participations` should be used.
            // Let's check if we can access `participations` on `initialLogs`.
            // The `WorkLog` interface has `participations?: ...`.

            const amount = logs.reduce((sum, l) => {
                if (l.participations && l.participations.length > 0) {
                    const p = l.participations.find(p => p.workerId === worker.id);
                    return sum + (p ? p.payment : 0);
                }
                return sum + l.unit_price;
            }, 0);

            // Apply VAT if business
            const hasBusiness = !!worker.businessRegistrationNumber && worker.businessRegistrationNumber.trim() !== '';
            const vat = hasBusiness ? Math.floor(amount * 0.1) : 0;
            const totalAmount = amount + vat;

            return { ...worker, unpaidAmount: totalAmount, count: logs.length };
        }).filter(w => w.unpaidAmount > 0);

        return { clientUnpaid, workerUnpaid };
    }, [initialClients, initialWorkers, initialLogs]);

    const handleDownloadExcel = () => {
        const wb = XLSX.utils.book_new();

        // Sheet 1: Summary
        const summaryData = [
            { 항목: '총 청구액 (매출)', 금액: totalBilled },
            { 항목: '총 노무비 (매입)', 금액: totalPayout },
            { 항목: '예상 마진 (수익)', 금액: totalMargin },
        ];
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, '요약');

        // Sheet 2: Client Stats
        const clientData = clientStats.map(c => ({
            팀: c.team?.name || '공통',
            거래처명: c.name,
            작업횟수: c.count,
            청구금액: c.billed,
            수금액: c.collected,
            미수금: c.receivables
        }));
        const wsClient = XLSX.utils.json_to_sheet(clientData);
        XLSX.utils.book_append_sheet(wb, wsClient, '거래처별 현황');

        // Sheet 3: Worker Stats
        const workerData = workerStats.map(w => ({
            팀: w.team?.name || '공통',
            성명: w.name,
            숙련도: w.skill_level,
            작업횟수: w.count,
            지급액: w.earned
        }));
        const wsWorker = XLSX.utils.json_to_sheet(workerData);
        XLSX.utils.book_append_sheet(wb, wsWorker, '인력별 현황');

        // Sheet 4: Raw Logs (Optional but helpful)
        const logData = filteredLogs.map(l => {
            const client = initialClients.find(c => c.id === l.clientId);
            return {
                날짜: l.date,
                시간: l.start_time,
                거래처: client?.name || 'Unknown',
                작업내용: l.volume_type,
                상태: l.status,
                청구액: l.billable_amount,
                지급액: l.total_payment_to_workers,
                비고: l.notes
            };
        });
        const wsLogs = XLSX.utils.json_to_sheet(logData);
        XLSX.utils.book_append_sheet(wb, wsLogs, '작업내역상세');

        const fileName = `settlement-${cycle}-${cycle === 'Monthly' ? selectedMonth : (cycle === 'Weekly' ? selectedWeek : selectedDate)}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };


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
                        <button
                            className={`px-4 py-2 rounded font-medium transition-colors ${activeTab === 'unpaid' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            onClick={() => setActiveTab('unpaid')}
                        >
                            미정산 현황
                        </button>
                    </div>

                    <SettlementExportButton
                        targetId="settlement-report-area"
                        fileName={`settlement-${cycle}-${cycle === 'Monthly' ? selectedMonth : (cycle === 'Weekly' ? selectedWeek : selectedDate)}`}
                        onExcelClick={handleDownloadExcel}
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
                {/* Unpaid Tab */}
                {activeTab === 'unpaid' && (
                    <div className="space-y-6">
                        {/* Client Unpaid */}
                        <div className="bg-white shadow rounded-lg overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
                                <h3 className="font-bold text-lg text-red-800">거래처 미수금 현황 (전체)</h3>
                                <p className="text-sm text-red-600">
                                    총 미수금: {unpaidStats.clientUnpaid.reduce((sum, c) => sum + c.unpaidAmount, 0).toLocaleString()}원
                                </p>
                            </div>

                            {/* Batch Action Bar */}
                            {selectedUnpaidClientIds.size > 0 && (
                                <div className="px-6 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                                    <span className="text-sm text-blue-800 font-medium">
                                        {selectedUnpaidClientIds.size}개 거래처 선택됨
                                    </span>
                                    <button
                                        onClick={handleMarkAsPaid}
                                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 shadow-sm"
                                    >
                                        수금 처리 (완료)
                                    </button>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <span className="sr-only">Select</span>
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">거래처명</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">미수 건수</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">미수금액</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {unpaidStats.clientUnpaid.map(c => (
                                            <tr key={c.id} className={selectedUnpaidClientIds.has(c.id) ? 'bg-blue-50' : ''}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUnpaidClientIds.has(c.id)}
                                                        onChange={() => toggleUnpaidClientSelection(c.id)}
                                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    <span
                                                        className="cursor-pointer border-b border-dotted border-gray-400 hover:text-blue-600 text-blue-600 font-bold"
                                                        onClick={(e) => handleClientClick(e, c)}
                                                    >
                                                        {c.name}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{c.count}건</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 text-right">{c.unpaidAmount.toLocaleString()}원</td>
                                            </tr>
                                        ))}
                                        {unpaidStats.clientUnpaid.length === 0 && (
                                            <tr><td colSpan={3} className="px-6 py-4 text-center text-gray-500">미수금 내역이 없습니다.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Worker Unpaid */}
                        <div className="bg-white shadow rounded-lg overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 bg-orange-50">
                                <h3 className="font-bold text-lg text-orange-800">인력 미지급 현황 (전체)</h3>
                                <p className="text-sm text-orange-600">
                                    총 미지급액: {unpaidStats.workerUnpaid.reduce((sum, w) => sum + w.unpaidAmount, 0).toLocaleString()}원
                                </p>
                            </div>

                            {/* Batch Action Bar */}


                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">성명</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">미지급 건수</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">미지급액</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {unpaidStats.workerUnpaid.map(w => (
                                            <tr key={w.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    <span
                                                        className="cursor-pointer border-b border-dotted border-gray-400 hover:text-orange-600 text-orange-700 font-bold"
                                                        onClick={(e) => handleWorkerClick(e, w)}
                                                    >
                                                        {w.name}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{w.count}건</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-orange-600 text-right">{w.unpaidAmount.toLocaleString()}원</td>
                                            </tr>
                                        ))}
                                        {unpaidStats.workerUnpaid.length === 0 && (
                                            <tr><td colSpan={3} className="px-6 py-4 text-center text-gray-500">미지급 내역이 없습니다.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
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

            {/* Client Info Popup */}
            {activeClientPopup && (
                <div
                    className="fixed z-50 bg-white p-4 rounded-lg shadow-2xl border border-gray-200 text-sm"
                    style={{
                        top: activeClientPopup.y + 10,
                        left: activeClientPopup.x,
                        minWidth: '280px',
                        maxWidth: '320px'
                    }}
                >
                    <div className="flex justify-between items-center mb-3 border-b pb-2">
                        <h4 className="font-bold text-gray-900 text-base">{activeClientPopup.client.name}</h4>
                        <button
                            onClick={closePopup}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="space-y-2.5">
                        <div className="grid grid-cols-3 gap-2">
                            <span className="text-gray-500 col-span-1 font-medium">사업자번호</span>
                            <span className="col-span-2 text-gray-900">{activeClientPopup.client.businessRegistrationNumbers?.[0] || '-'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <span className="text-gray-500 col-span-1 font-medium">대표자명</span>
                            <span className="col-span-2 text-gray-900">{activeClientPopup.client.businessOwnerNames?.[0] || '-'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <span className="text-gray-500 col-span-1 font-medium">이메일</span>
                            <span className="col-span-2 text-gray-900 break-all">{activeClientPopup.client.taxInvoiceEmail || '-'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <span className="text-gray-500 col-span-1 font-medium">연락처</span>
                            <span className="col-span-2 text-gray-900">{activeClientPopup.client.contact_info || '-'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <span className="text-gray-500 col-span-1 font-medium">주소</span>
                            <span className="col-span-2 text-gray-900">{activeClientPopup.client.address || '-'}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Worker Info Popup */}
            {activeWorkerPopup && (
                <div
                    className="fixed z-50 bg-white p-4 rounded-lg shadow-2xl border border-gray-200 text-sm"
                    style={{
                        top: activeWorkerPopup.y + 10,
                        left: activeWorkerPopup.x,
                        minWidth: '280px',
                        maxWidth: '320px'
                    }}
                >
                    <div className="flex justify-between items-center mb-3 border-b pb-2">
                        <h4 className="font-bold text-gray-900 text-base">{activeWorkerPopup.worker.name}</h4>
                        <button
                            onClick={closePopup}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="space-y-2.5">
                        <div className="grid grid-cols-3 gap-2">
                            <span className="text-gray-500 col-span-1 font-medium">주민번호</span>
                            <span className="col-span-2 text-gray-900 font-mono">{activeWorkerPopup.worker.residentRegistrationNumber || '-'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <span className="text-gray-500 col-span-1 font-medium">은행명</span>
                            <span className="col-span-2 text-gray-900">{activeWorkerPopup.worker.bank_name || '-'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <span className="text-gray-500 col-span-1 font-medium">계좌번호</span>
                            <span className="col-span-2 text-gray-900 font-mono">{activeWorkerPopup.worker.bank_account || '-'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <span className="text-gray-500 col-span-1 font-medium">연락처</span>
                            <span className="col-span-2 text-gray-900">{activeWorkerPopup.worker.phone || '-'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <span className="text-gray-500 col-span-1 font-medium">주소</span>
                            <span className="col-span-2 text-gray-900">{activeWorkerPopup.worker.address || '-'}</span>
                        </div>

                        {(activeWorkerPopup.worker.businessRegistrationNumber || activeWorkerPopup.worker.companyName) && (
                            <div className="border-t pt-2 mt-2">
                                <h5 className="font-bold text-gray-900 mb-1 text-xs">사업자 정보</h5>
                                <div className="space-y-1">
                                    <div className="grid grid-cols-3 gap-2">
                                        <span className="text-gray-500 col-span-1 font-medium">사업자번호</span>
                                        <span className="col-span-2 text-gray-900 font-mono">{activeWorkerPopup.worker.businessRegistrationNumber || '-'}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <span className="text-gray-500 col-span-1 font-medium">상호명</span>
                                        <span className="col-span-2 text-gray-900">{activeWorkerPopup.worker.companyName || '-'}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <span className="text-gray-500 col-span-1 font-medium">대표자</span>
                                        <span className="col-span-2 text-gray-900">{activeWorkerPopup.worker.representativeName || '-'}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <span className="text-gray-500 col-span-1 font-medium">개업일자</span>
                                        <span className="col-span-2 text-gray-900">{activeWorkerPopup.worker.openingDate || '-'}</span>
                                    </div>
                                    {activeWorkerPopup.worker.businessRegistrationImage && (
                                        <div className="grid grid-cols-3 gap-2 mt-1">
                                            <span className="text-gray-500 col-span-1 font-medium">사본</span>
                                            <span className="col-span-2 text-gray-900">
                                                <a
                                                    href={activeWorkerPopup.worker.businessRegistrationImage}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 underline text-xs"
                                                >
                                                    [이미지 보기]
                                                </a>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
