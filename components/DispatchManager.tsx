'use client';

import { useState } from 'react';
import { Client, Worker, WorkLog } from '@/types';
import { Plus, Save, Edit2, X, Clock, Trash2 } from 'lucide-react';
import { createWorkLogAction, updateWorkLogAction, deleteWorkLogAction } from '@/app/actions';
import Calendar from './Calendar';

import ScheduleBriefing from './ScheduleBriefing';
import { useTeam } from '@/context/TeamContext';

interface DispatchManagerProps {
    initialClients: Client[];
    initialWorkers: Worker[];
    initialLogs: WorkLog[];
}

export default function DispatchManager({ initialClients, initialWorkers, initialLogs }: DispatchManagerProps) {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState('09:00');
    const [logs] = useState<WorkLog[]>(initialLogs);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [editingLogTeamId, setEditingLogTeamId] = useState<string | null>(null); // For Global Mode Editing
    const [viewMode, setViewMode] = useState<'Admin' | 'Briefing'>('Admin');

    // Form State
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedRateId, setSelectedRateId] = useState('');
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);

    // New States for Status & Waiting Fee
    const [status, setStatus] = useState<'Normal' | 'Waiting' | 'Cancelled'>('Normal');
    const [waitingRate, setWaitingRate] = useState<number>(0.3); // Default 30%
    const [isManualWaiting, setIsManualWaiting] = useState(false);
    const [manualBillable, setManualBillable] = useState<number>(0);
    const [manualWorkerPay, setManualWorkerPay] = useState<number>(0);

    // Custom Worker Pay State
    const [workerPayments, setWorkerPayments] = useState<Record<string, number>>({});

    // VAT & Payment Tracking
    const [isTaxFree, setIsTaxFree] = useState(false);
    const [isPaidFromClient, setIsPaidFromClient] = useState(false);


    // Derived Data
    const filteredLogs = logs
        .filter(log => log.date === selectedDate)
        .sort((a, b) => (a.start_time || '00:00').localeCompare(b.start_time || '00:00'));
    const selectedClient = initialClients.find(c => c.id === selectedClientId);
    const selectedRate = selectedClient?.rates.find(r => r.id === selectedRateId);

    // Calculation Logic
    const standardHeadcount = selectedRate?.headcount || 0;
    const actualHeadcount = status === 'Normal' ? selectedWorkerIds.length : standardHeadcount;
    // If waiting, usually no workers or minimal? User said "Waiting... charge 30-50%".
    // If cancelled/waiting, we often don't dispatch workers or they return back.
    // Let's assume for 'Waiting' we might still select workers who waited?
    // User said "container came late... or cancelled".
    // If cancelled, usually workers get 'Transportation Fee' or 'Waiting Fee'.
    // Let's apply logic:
    // "Charge Client 30-50%".
    // Worker Pay? -> Usually half day or waiting fee.
    // Let's implement basics:
    // If Normal -> Standard logic.
    // If Waiting/Cancelled -> Billable = Standard Total * waitingRate. Worker Pay = ? (Let's keep it simple: 0 or let user override? safer to set 0 for now or same ratio).
    // Let's implicitly assume Worker Pay also scales by waitingRate for now, or is 0 if no workers selected.

    const baseRatePerPerson = selectedRate?.rate_per_person || 0;
    const totalJobPayStandard = baseRatePerPerson * standardHeadcount;

    // Fee Logic (Per Person)
    const feePerPerson = selectedClient?.fee_per_person || 0;
    const feeTotalStandard = feePerPerson * standardHeadcount;

    let totalBillableBase = totalJobPayStandard + feeTotalStandard; // Standard Billable (Pay + Fee)

    // Adjust for N-Split (Normal Status Only)
    // If Normal, and actual != standard, we fix total billable?
    // User: "Client billing remains based on the *standard contract rate*".
    // So Client Bill is ALWAYS Standard Rate * Standard Headcount (+ Fee).
    // Worker Pay varies.

    // Apply Waiting Rate
    if (status !== 'Normal') {
        totalBillableBase = Math.floor(totalBillableBase * waitingRate);
    }

    // const supplyPrice = totalBillableBase;
    // const vatAmount = Math.floor(supplyPrice * 0.1);
    // const totalBillToClient = supplyPrice + vatAmount;

    // Worker Pay Calculation
    // Total Available for Workers = Supply Price - Agency Fee?
    // Or Agency Fee is fixed?
    // User: "deduct x won per person".
    // So per worker pay = (Billable / Headcount) - Fee?
    // Wait, "Client pays Y. Agency takes X. Worker gets Y-X".

    // Logic:
    // If payType === 'TOTAL':
    //   Rate input is 'Total Job Price' (e.g. 350,000)
    //   Fee input is 'Total Fee' (e.g. 50,000)
    //   Worker Pay Per Person = (Total - Fee) / Standard Headcount
    // If payType === 'INDIVIDUAL' (Default):
    //   Rate input is 'Per Person'
    //   Fee input is 'Per Person'
    //   Worker Pay Per Person = Rate - Fee

    const isTotalPay = selectedClient?.payType === 'TOTAL';
    let standardUnitBillable: number;
    let unitPayForWorker: number;

    if (isTotalPay) {
        // Total Mode
        const totalJobPrice = baseRatePerPerson; // 1. Rate is Total (Raw Won)
        const totalFee = feePerPerson; // 2. Fee is Total

        const totalWorkerPayPool = totalJobPrice - totalFee;

        // Derived Unit Pay
        if (standardHeadcount > 0) {
            unitPayForWorker = Math.floor(totalWorkerPayPool / standardHeadcount);
            // Billable Unit derived for reference (though we use Total for billing)
            standardUnitBillable = Math.floor(totalJobPrice / standardHeadcount);
        } else {
            unitPayForWorker = 0;
            standardUnitBillable = 0;
        }

    } else {
        // Individual Mode (Updated to Cost-Plus)
        // baseRatePerPerson is now treated as "Worker Cost" input
        unitPayForWorker = baseRatePerPerson;
        standardUnitBillable = unitPayForWorker + feePerPerson;
    }

    // Worker Pay Pool Calculation
    // For 'Total' mode, the pool is fixed regardless of actual headcount (usually), 
    // unless we strictly follow 'per person' distribution logic?
    // User said: "divide by 3 workers". 
    // If actual headcount != standard headcount?
    // Usually Total Pay implies fixed job price.

    let totalWorkerPayPool = unitPayForWorker * standardHeadcount;

    if (status !== 'Normal') {
        totalWorkerPayPool = Math.floor(totalWorkerPayPool * waitingRate);
    }

    let finalPayPerWorker = (actualHeadcount > 0) ? Math.floor(totalWorkerPayPool / actualHeadcount) : 0;

    // Recalculate Supply Price (Client Bill)
    // Client Bill = (standardUnitBillable * standardHeadcount) * (status factor).
    // In Total Mode, (standardUnitBillable * standardHeadcount) ~ Total Job Price.

    let finalSupplyPrice: number;
    if (isTotalPay) {
        finalSupplyPrice = baseRatePerPerson; // Original Total
    } else {
        finalSupplyPrice = (standardUnitBillable * standardHeadcount);
    }

    if (status !== 'Normal') {
        finalSupplyPrice = Math.floor(finalSupplyPrice * waitingRate);
    }

    const finalVat = isTaxFree ? 0 : Math.floor(finalSupplyPrice * 0.1);
    let finalBillTotal = finalSupplyPrice + finalVat;

    // Manual Override Logic
    if (isManualWaiting && (status === 'Waiting' || status === 'Cancelled')) {
        finalBillTotal = manualBillable;
        finalPayPerWorker = manualWorkerPay;

        // Recalculate Supply Price from Manual Billable (Back-calculate from VAT)
        // Profit = Supply - Pay. We need Supply.
        if (isTaxFree) {
            finalSupplyPrice = finalBillTotal;
        } else {
            // Bill = Supply + VAT(10%) = Supply * 1.1
            // Supply = Bill / 1.1
            finalSupplyPrice = Math.round(finalBillTotal / 1.1);
        }
    }


    const { selectedTeam } = useTeam();

    const handleSaveLog = async () => {
        if (!selectedClient || !selectedRate) return;
        // Allow 0 workers even if Normal (User requested optional assignment)
        // if (status === 'Normal' && actualHeadcount === 0) return;

        const logData: Omit<WorkLog, 'id'> = {
            date: selectedDate,
            start_time: selectedTime,
            clientId: selectedClient.id,
            worker_ids: selectedWorkerIds,
            volume_type: selectedRate.volume_type,
            quantity: 1,
            status: status,
            waiting_rate: status === 'Normal' ? 0 : waitingRate,
            manualWaitingBillable: isManualWaiting ? manualBillable : undefined,
            participations: selectedWorkerIds.map(wid => ({
                workerId: wid,
                payment: workerPayments[wid] ?? finalPayPerWorker
            })),

            unit_price: finalPayPerWorker,
            total_payment_to_workers: isManualWaiting
                ? manualWorkerPay * (selectedWorkerIds.length > 0 ? selectedWorkerIds.length : actualHeadcount)
                : Object.values(workerPayments).reduce((sum, p) => sum + p, 0),

            billable_amount: finalBillTotal,
            is_billed: false,
            is_paid_to_workers: false,
            notes: `상태: ${status === 'Normal' ? '정상' : (status === 'Waiting' ? '대기' : '취소')}(${status !== 'Normal' ? waitingRate * 100 + '%' : ''}) | 기준: ${standardHeadcount}명, 투입: ${actualHeadcount}명`,
            teamId: isEditing && editingLogTeamId ? editingLogTeamId : (selectedTeam?.id === 'ALL' ? '' : selectedTeam?.id || '')
        };

        if (selectedTeam?.id === 'ALL' && !isEditing) {
            alert('전체 팀 보기 모드에서는 신규 작업을 등록할 수 없습니다. 특정 팀을 선택해주세요.');
            return;
        }

        try {
            if (isEditing && editingLogId) {
                await updateWorkLogAction(editingLogId, logData);
            } else {
                await createWorkLogAction(logData);
            }
            window.location.reload();
        } catch (e) {
            alert('저장 실패: ' + e);
        }
    };

    const handleEditClick = (log: WorkLog) => {
        setIsEditing(true);
        setEditingLogId(log.id);

        // Load data
        setSelectedDate(log.date);
        setSelectedTime(log.start_time || '09:00');
        setSelectedClientId(log.clientId);

        // Find Rate ID logic - simplified for now
        // In real app, we might need a mapping or verify volume_type
        // For now, let's just clear rate so user re-selects or find matching volume
        // Actually, we need to set selectedRateId to show correct form
        // But Rate ID is inside client.rates. We need to find it.
        const client = initialClients.find(c => c.id === log.clientId);
        if (client) {
            const rate = client.rates.find(r => r.volume_type === log.volume_type);
            if (rate) setSelectedRateId(rate.id);
        }

        setSelectedWorkerIds(log.worker_ids);
        setStatus(log.status as 'Normal' | 'Waiting' | 'Cancelled' || 'Normal');
        setWaitingRate(log.waiting_rate || 0.3);

        if (log.manualWaitingBillable !== undefined && log.manualWaitingBillable !== null) {
            setIsManualWaiting(true);
            setManualBillable(log.manualWaitingBillable);
            setManualWorkerPay(log.manualWaitingWorkerPay || 0);
        } else {
            setIsManualWaiting(false);
            setManualBillable(0);
            setManualWorkerPay(0);
        }

        // Restore custom payments
        const payments: Record<string, number> = {};
        if (log.participations) {
            log.participations.forEach(p => {
                payments[p.workerId] = p.payment;
            });
        }
        setWorkerPayments(payments);

        setIsTaxFree(log.isTaxFree || false);
        setIsPaidFromClient(log.isPaidFromClient || false);
        setEditingLogTeamId(log.teamId); // Preserve Team ID
    };

    const handleClientChange = (clientId: string) => {
        setSelectedClientId(clientId);
        setSelectedClientId(clientId);
        setSelectedRateId('');
        setSelectedWorkerIds([]);
        setWorkerPayments({});
        const client = initialClients.find(c => c.id === clientId);
        if (client) {
            setIsTaxFree(client.isTaxFree || false);
        }
    };


    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditingLogId(null);
        setSelectedClientId('');
        setSelectedRateId('');
        setSelectedTime('09:00');
        setSelectedTime('09:00');
        setSelectedWorkerIds([]);
        setWorkerPayments({});
        setStatus('Normal');
        setWaitingRate(0.3);
        setIsManualWaiting(false);
        setManualBillable(0);
        setManualWorkerPay(0);
        setEditingLogTeamId(null);
    };



    const handleDeleteLog = async (id: string) => {
        if (confirm('정말로 이 작업 기록을 삭제하시겠습니까?')) {
            try {
                await deleteWorkLogAction(id);
                window.location.reload();
            } catch (e) {
                alert('삭제 실패: ' + e);
            }
        }
    };

    const toggleWorker = (id: string) => {
        if (selectedWorkerIds.includes(id)) {
            setSelectedWorkerIds(selectedWorkerIds.filter(wid => wid !== id));
            const newPayments = { ...workerPayments };
            delete newPayments[id];
            setWorkerPayments(newPayments);
        } else {
            setSelectedWorkerIds([...selectedWorkerIds, id]);
            // Initialize payment with current calculated default
            setWorkerPayments({ ...workerPayments, [id]: finalPayPerWorker });
        }
    };

    // Update individual worker payment
    const handleWorkerPaymentChange = (id: string, amount: number) => {
        setWorkerPayments({ ...workerPayments, [id]: amount });
    };

    // Update all selected workers payment when standard rate changes (optional, but good for UX)
    // Actually, we use 'finalPayPerWorker' as default for new selections. 
    // Existing selections should probably NOT change unless user explicitly wants to reset?
    // Let's keep existing logic: manual overrides stick. 


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Date & Log List */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-0 rounded-lg shadow overflow-hidden">
                    <Calendar
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        logs={logs}
                    />
                </div>

                {viewMode === 'Briefing' && (
                    <ScheduleBriefing
                        date={selectedDate}
                        logs={filteredLogs}
                        clients={initialClients}
                        workers={initialWorkers}
                    />
                )}

                {viewMode === 'Admin' && (
                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold">작업 타임라인 ({filteredLogs.length})</h2>
                            <button
                                onClick={() => setViewMode('Briefing')}
                                className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200"
                            >
                                스케줄 뷰 보기
                            </button>
                        </div>
                        <div className="relative border-l-2 border-gray-200 ml-3 space-y-8 pb-4">
                            {(() => {
                                // Group logs by start_time
                                const groupedLogs: { [time: string]: WorkLog[] } = {};
                                filteredLogs.forEach(log => {
                                    const time = log.start_time || '미지정';
                                    if (!groupedLogs[time]) groupedLogs[time] = [];
                                    groupedLogs[time].push(log);
                                });

                                // Sort times
                                const sortedTimes = Object.keys(groupedLogs).sort();

                                return sortedTimes.map(time => {
                                    const group = groupedLogs[time];
                                    return (
                                        <div key={time} className="relative ml-6">
                                            {/* Time Label - Shared for the group */}
                                            <div className="text-sm font-bold text-gray-500 mb-2 flex items-center">
                                                <Clock className="w-4 h-4 mr-2" />
                                                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700">{time}</span>
                                            </div>

                                            {/* Logs Container: Grid/Flex for horizontal layout */}
                                            <div className="flex flex-wrap gap-4">
                                                {group.map(log => {
                                                    const client = initialClients.find(c => c.id === log.clientId);
                                                    return (
                                                        <div key={log.id} className="relative min-w-[280px] flex-1 max-w-sm">
                                                            {/* Dot Indicator (Absolute to the card or shared line? Let's put it on the card or the line) 
                                                                If we want the dot on the timeline, we need one dot per time group? 
                                                                Or one dot per log? 
                                                                The original design had a dot on the timeline line. 
                                                                Let's put ONE dot for the time group.
                                                            */}

                                                            <div className={`border rounded-lg p-3 hover:bg-gray-50 shadow-sm transition-shadow 
                                                            ${(log.status === 'Waiting' || log.status === 'Cancelled') ? 'bg-orange-50 border-orange-200' : 'bg-white'} 
                                                            ${editingLogId === log.id ? 'ring-2 ring-blue-500' : ''}`}
                                                            >
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <div className="font-semibold text-gray-900">
                                                                            {client?.name}
                                                                            {selectedTeam?.id === 'ALL' && (
                                                                                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-800 font-normal">
                                                                                    {client?.team?.name || 'Unknown'}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-sm text-gray-600">{log.volume_type}</div>
                                                                    </div>
                                                                    <div className="flex flex-col items-end gap-1">
                                                                        <div className={`text-xs font-bold px-2 py-1 rounded 
                                                                        ${log.status === 'Normal' ? 'bg-blue-100 text-blue-800' : (log.status === 'Waiting' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800')}
                                                                    `}>
                                                                            {log.status === 'Waiting' ? '대기' : (log.status === 'Cancelled' ? '취소' : '정상')}
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleEditClick(log)}
                                                                            className="text-blue-600 hover:text-blue-800 text-xs flex items-center bg-white border border-blue-200 px-2 py-1 rounded mt-1"
                                                                        >
                                                                            <Edit2 className="w-3 h-3 mr-1" />
                                                                            수정
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteLog(log.id)}
                                                                            className="text-red-600 hover:text-red-800 text-xs flex items-center bg-white border border-red-200 px-2 py-1 rounded mt-1"
                                                                        >
                                                                            <Trash2 className="w-3 h-3 mr-1" />
                                                                            삭제
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-2 text-xs text-gray-500 border-t pt-2 flex justify-between">
                                                                    <span>청구: {log.billable_amount?.toLocaleString()}원</span>
                                                                    <span className="font-medium">지급: {log.total_payment_to_workers.toLocaleString()}원</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Timeline Dot for the Group (placed to the left of the container) */}
                                            <span className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-white bg-gray-400"></span>
                                        </div>
                                    );
                                });
                            })()}
                            {filteredLogs.length === 0 && <p className="ml-6 text-gray-500 text-sm">등록된 작업이 없습니다.</p>}
                        </div>
                    </div>
                )}
            </div>

            {/* New Dispatch Form - Hide in Briefing Mode? Or Keep? Keep for editing. */}
            <div className="lg:col-span-2">
                {viewMode === 'Briefing' && (
                    <div className="bg-white p-6 rounded-lg shadow mb-6 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">관리자 모드로 돌아가기</h3>
                        <button
                            onClick={() => setViewMode('Admin')}
                            className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700"
                        >
                            관리 모드 (등록/수정)
                        </button>
                    </div>
                )}

                {(viewMode === 'Admin' || isEditing) && (
                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold flex items-center">
                                {isEditing ? (
                                    <>
                                        <Edit2 className="w-5 h-5 mr-2 text-blue-600" />
                                        작업 수정
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-5 h-5 mr-2 text-green-600" />
                                        새 작업 등록
                                    </>
                                )}
                            </h2>
                            {isEditing && (
                                <button onClick={handleCancelEdit} className="text-gray-500 hover:text-gray-700 flex items-center text-sm">
                                    <X className="w-4 h-4 mr-1" />
                                    취소
                                </button>
                            )}
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">작업 시간</label>
                            <input
                                type="time"
                                className="w-full border rounded-md p-2"
                                value={selectedTime}
                                onChange={(e) => setSelectedTime(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">거래처 선택</label>
                                <select
                                    className="w-full border rounded-md p-2"
                                    value={selectedClientId}
                                    onChange={(e) => {
                                        setSelectedClientId(e.target.value);
                                        setSelectedRateId('');
                                        setSelectedWorkerIds([]);
                                    }}
                                >
                                    <option value="">선택하세요</option>
                                    {initialClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">작업 유형(단가)</label>
                                <select
                                    className="w-full border rounded-md p-2"
                                    value={selectedRateId}
                                    onChange={(e) => setSelectedRateId(e.target.value)}
                                    disabled={!selectedClientId}
                                >
                                    <option value="">선택하세요</option>
                                    {selectedClient?.rates.map((r, idx) => (
                                        <option key={r.id || idx} value={r.id}>{r.volume_type} ({r.headcount}명 기준)</option>
                                    ))}
                                </select>
                            </div>
                        </div>


                        {/* VAT & Payment Status */}
                        {selectedRate && (
                            <div className="mt-4 flex space-x-6 p-4 bg-gray-50 rounded-lg">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={isTaxFree}
                                        onChange={(e) => setIsTaxFree(e.target.checked)}
                                        className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded"
                                    />
                                    <span className="text-sm font-semibold text-gray-700">현금결제 (부가세 제외)</span>
                                </label>

                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={isPaidFromClient}
                                        onChange={(e) => setIsPaidFromClient(e.target.checked)}
                                        className="form-checkbox h-4 w-4 text-green-600 border-gray-300 rounded"
                                    />
                                    <span className="text-sm font-semibold text-green-700">거래처 결제(입금) 완료</span>
                                </label>
                            </div>
                        )}

                        {/* Status Selection & Manual Override */}
                        {selectedRate && (
                            <div className="mt-4 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">작업 상태</label>
                                        <select
                                            className="w-full border rounded-md p-2"
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value as 'Normal' | 'Waiting' | 'Cancelled')}
                                        >
                                            <option value="Normal">정상 작업</option>
                                            <option value="Waiting">대기 (지연)</option>
                                            <option value="Cancelled">취소</option>
                                        </select>
                                    </div>
                                    {(status === 'Waiting' || status === 'Cancelled') && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">대기/취소 청구 비율</label>
                                            <select
                                                className="w-full border rounded-md p-2"
                                                value={waitingRate}
                                                onChange={(e) => setWaitingRate(parseFloat(e.target.value))}
                                            >
                                                <option value={0.3}>30% 청구</option>
                                                <option value={0.5}>50% 청구</option>
                                                <option value={1.0}>100% 청구</option>
                                                <option value={0}>청구 안함</option>
                                            </select>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                                    <div className="flex items-center mb-4">
                                        <input
                                            type="checkbox"
                                            id="manualWaiting"
                                            checked={isManualWaiting}
                                            onChange={(e) => setIsManualWaiting(e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="manualWaiting" className="ml-2 block text-sm font-bold text-gray-900">
                                            금액 직접 입력 (대기/취소료, 심야/인원초과 등)
                                        </label>
                                    </div>

                                    {isManualWaiting && (
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">최종 청구액 (VAT 포함)</label>
                                                <input
                                                    type="number"
                                                    value={manualBillable}
                                                    onChange={(e) => setManualBillable(parseInt(e.target.value) || 0)}
                                                    className="w-full border rounded-md p-2"
                                                    placeholder="예: 50000"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">인당 지급액</label>
                                                <input
                                                    type="number"
                                                    value={manualWorkerPay}
                                                    onChange={(e) => setManualWorkerPay(parseInt(e.target.value) || 0)}
                                                    className="w-full border rounded-md p-2"
                                                    placeholder="예: 30000"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {selectedRate && (
                            <div className="mt-6 border-t pt-4">
                                <div className={`mb-4 p-4 rounded-md ${status === 'Normal' ? 'bg-blue-50' : 'bg-orange-50'}`}>
                                    <h3 className={`font-semibold mb-2 ${status === 'Normal' ? 'text-blue-900' : 'text-orange-900'}`}>
                                        {status === 'Normal' ? `정상 정산 미리보기 (${isTotalPay ? '전체 총액' : '인당'})` : `대기/취소 정산 (${waitingRate * 100}%)`}
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            {/* For Cost-Plus: baseRate (Input) is Worker Cost */}
                                            <span className="text-gray-600">
                                                {isTotalPay ? '기준 공급가(전체 Invoice)' : '기준 지급액(인당 Cost)'}:
                                            </span> <span className="font-medium">
                                                {baseRatePerPerson.toLocaleString()}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">{isTotalPay ? '총 수수료:' : '인당 수수료:'}</span> <span className="font-medium">
                                                +{feePerPerson.toLocaleString()}
                                            </span>
                                        </div>
                                        <div>
                                            {/* Show Total Billable for Clarity */}
                                            <span className="text-gray-600">청구 공급가(Total):</span> <span className="font-bold text-lg text-blue-600">
                                                {finalSupplyPrice.toLocaleString()}
                                            </span>
                                            {!isTotalPay && (
                                                <span className="text-xs text-gray-400 block">
                                                    (인당 {standardUnitBillable.toLocaleString()}원 × {actualHeadcount || standardHeadcount}명)
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <span className="text-gray-600">부가세 (10%):</span> <span className="font-medium">{finalVat.toLocaleString()}</span>
                                        </div>
                                        <div className="col-span-2 border-t border-gray-200 mt-2 pt-2">
                                            <div className="flex justify-between font-bold text-lg">
                                                <span>최종 청구액:</span>
                                                <span>{finalBillTotal.toLocaleString()}원</span>
                                            </div>
                                        </div>

                                        <div className="col-span-2 mt-2 bg-white p-2 rounded border border-gray-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">인력 지급 총액:</span>
                                                {/* Total Worker Pay is sum of individual payments */}
                                                <span className="font-bold">
                                                    {(isManualWaiting && (status === 'Waiting' || status === 'Cancelled'))
                                                        ? (manualWorkerPay * (actualHeadcount || 1)).toLocaleString()
                                                        : Object.values(workerPayments).reduce((sum, p) => sum + p, 0).toLocaleString()}원
                                                </span>
                                                {/* Note: using (actualHeadcount || 1) to avoid 0 if no workers selected yet, just for preview? 
                                                   Actually totalWorkerPayPool is the accurate total. 
                                                   But finalPayPerWorker * actual matches the distributed amount. */}
                                            </div>
                                            <div className="flex justify-between items-center bg-green-50 p-2 rounded border border-green-200 mt-2">
                                                <span className="text-sm font-bold text-green-800">예상 회사 수익 (수수료):</span>
                                                <span className="font-bold text-green-900">
                                                    {/* In Cost-Plus: Supply - WorkerPay. 
                                                        Warning: if manualWorkerPay is used, Fee = Supply - ManualPay.
                                                        If standard, Fee = (Cost+Fee) - Cost = Fee. Correct. */}
                                                    {(finalSupplyPrice - ((isManualWaiting && (status === 'Waiting' || status === 'Cancelled')) ? manualWorkerPay * (actualHeadcount || 1) : Object.values(workerPayments).reduce((sum, p) => sum + p, 0))).toLocaleString()}원
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                                                <span>지급 기준 ({actualHeadcount > 0 ? actualHeadcount : standardHeadcount}명 분):</span>
                                                <span>
                                                    {(isManualWaiting && (status === 'Waiting' || status === 'Cancelled')) ? manualWorkerPay.toLocaleString() : unitPayForWorker.toLocaleString()}원 (기본)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        투입 인력 선택 {actualHeadcount > 0 ? `(${actualHeadcount}명)` : '(미배정 - 추후 확정 가능)'}
                                    </label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto border rounded-md p-2">
                                        {initialWorkers.map(worker => (
                                            <div
                                                key={worker.id}
                                                onClick={() => toggleWorker(worker.id)}
                                                className={`p-2 rounded cursor-pointer border ${selectedWorkerIds.includes(worker.id) ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50 border-gray-200'}`}
                                            >
                                                <div className="font-medium text-sm">{worker.name}</div>
                                                <div className="text-xs text-gray-500">
                                                    {{
                                                        'Novice': '초급',
                                                        'Intermediate': '중급',
                                                        'Expert': '고급',
                                                        'Specialist': '전문'
                                                    }[worker.skill_level] || worker.skill_level}
                                                </div>
                                                {selectedWorkerIds.includes(worker.id) && (
                                                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                                        <label className="text-xs text-gray-600 block mb-1">지급액</label>
                                                        <input
                                                            type="number"
                                                            value={workerPayments[worker.id] ?? finalPayPerWorker}
                                                            onChange={(e) => handleWorkerPaymentChange(worker.id, parseInt(e.target.value) || 0)}
                                                            className="w-full text-xs p-1 border rounded"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {status !== 'Normal' && actualHeadcount === 0 && (
                                        <p className="text-xs text-orange-600 mt-1">* 대기/취소 시에도 보상 지급할 인력을 선택해주세요.</p>
                                    )}
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={handleSaveLog}
                                        className={`flex items-center px-6 py-3 rounded-lg text-white font-bold 
                                ${status !== 'Normal' || actualHeadcount >= 0 ? (isEditing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700') : 'bg-gray-300 cursor-not-allowed'}`}
                                    >
                                        {isEditing ? <Edit2 className="w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                                        {isEditing ? '수정 완료' : '작업 등록'}
                                    </button>
                                    {isEditing && editingLogId && (
                                        <button
                                            onClick={() => handleDeleteLog(editingLogId)}
                                            className="flex items-center px-6 py-3 rounded-lg text-white font-bold bg-red-600 hover:bg-red-700 ml-4"
                                        >
                                            <Trash2 className="w-5 h-5 mr-2" />
                                            삭제
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

