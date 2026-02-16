'use client';

import { useState } from 'react';
import { Worker } from '@/types';
import { Plus, Search, Edit2, User, Trash2 } from 'lucide-react';

import { createWorkerAction, updateWorkerAction, deleteWorkerAction } from '@/app/actions';
import { useTeam } from '@/context/TeamContext';

interface WorkerListProps {
    initialWorkers: Worker[];
}

export default function WorkerList({ initialWorkers }: WorkerListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWorker, setEditingWorker] = useState<Worker | null>(null);


    const { selectedTeam } = useTeam();
    const isGlobalMode = selectedTeam?.id === 'ALL';

    // Filter workers
    const filteredWorkers = initialWorkers.filter(w =>
        w.name.includes(searchTerm) || w.phone.includes(searchTerm)
    );

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        // File Upload Helper
        const uploadFile = async (file: File): Promise<string | null> => {
            if (!file || file.size === 0) return null;
            const uploadData = new FormData();
            uploadData.append('file', file);
            try {
                const res = await fetch('/api/upload', { method: 'POST', body: uploadData });
                if (res.ok) {
                    const json = await res.json();
                    return json.url;
                }
            } catch (err) {
                console.error(err);
            }
            return null;
        };

        const idCardFile = formData.get('resident_id_front_file') as File;
        let idCardUrl = editingWorker?.resident_id_front;
        if (idCardFile && idCardFile.size > 0) {
            const url = await uploadFile(idCardFile);
            if (url) idCardUrl = url;
        }

        const bankBookFile = formData.get('bankBookImage_file') as File;
        let bankBookUrl = editingWorker?.bankBookImage;
        if (bankBookFile && bankBookFile.size > 0) {
            const url = await uploadFile(bankBookFile);
            if (url) bankBookUrl = url;
        }

        const workerData: Omit<Worker, 'id'> = {
            name: formData.get('name') as string,
            phone: formData.get('phone') as string,
            address: formData.get('address') as string, // Added address
            residentRegistrationNumber: formData.get('residentRegistrationNumber') as string,
            bank_name: formData.get('bank_name') as string,
            bank_account: formData.get('bank_account') as string,
            resident_id_front: idCardUrl,
            bankBookImage: bankBookUrl,
            skill_level: formData.get('skill_level') as Worker['skill_level'],
            contract_type: formData.get('contract_type') as Worker['contract_type'],
            status: formData.get('status') as Worker['status'],
            notes: formData.get('notes') as string,
            teamId: selectedTeam?.id === 'ALL' ? '' : (selectedTeam?.id || ''),
        };

        try {
            if (editingWorker) {
                await updateWorkerAction(editingWorker.id, workerData);
            } else {
                await createWorkerAction(workerData);
            }
            setIsModalOpen(false);
            window.location.reload();
        } catch (error) {
            alert('오류가 발생했습니다: ' + error);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`${name} 님을 정말 삭제하시겠습니까?`)) {
            try {
                await deleteWorkerAction(id);
                // Force reload or just let revalidatePath handle it if using router refresh.
                // Assuming revalidatePath works, but client state 'workers' is from props.
                // We are using `filteredWorkers` derived from `initialWorkers` prop.
                // Server action revalidates the page, so a refresh is needed to see changes if not using optimistic updates.
                window.location.reload();
            } catch (error) {
                alert('삭제 실패: ' + error);
            }
        }
    };

    return (
        <div className="bg-white shadow rounded-lg p-6">
            {/* Header Actions */}
            <div className="flex justify-between mb-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="이름/연락처 검색..."
                        className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                </div>
                <button
                    onClick={() => {
                        if (isGlobalMode) {
                            alert('전체 팀 보기 모드에서는 인력을 등록할 수 없습니다. 특정 팀을 선택해주세요.');
                            return;
                        }
                        setEditingWorker(null);
                        setIsModalOpen(true);
                    }}
                    className={`flex items-center px-4 py-2 rounded-lg ${isGlobalMode ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                    disabled={isGlobalMode}
                >
                    <Plus className="w-5 h-5 mr-2" />
                    인력 등록
                </button>
            </div>

            {/* List / Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {isGlobalMode && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">팀</th>}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">구분</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">숙련도</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연락처</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredWorkers.map((worker) => (
                            <tr key={worker.id} className="hover:bg-gray-50">
                                {isGlobalMode && (
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                            {worker.team?.name || 'Unknown'}
                                        </span>
                                    </td>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                                            <User className="w-6 h-6 text-gray-500" />
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{worker.name}</div>
                                            <div className="text-sm text-gray-500">{worker.notes}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${worker.contract_type === 'Regular' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {worker.contract_type === 'Regular' ? '정규' : '비정규'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${worker.skill_level === 'Expert' ? 'bg-green-100 text-green-800' :
                                            worker.skill_level === 'Intermediate' ? 'bg-blue-100 text-blue-800' :
                                                'bg-yellow-100 text-yellow-800'}`}>
                                        {{
                                            'Novice': '초급',
                                            'Intermediate': '중급',
                                            'Expert': '고급',
                                            'Specialist': '전문'
                                        }[worker.skill_level] || worker.skill_level}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {worker.phone}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${worker.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {worker.status === 'Active' ? '활동중' : '중단'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => { setEditingWorker(worker); setIsModalOpen(true); }} className="text-indigo-600 hover:text-indigo-900 mr-2">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(worker.id, worker.name)} className="text-red-600 hover:text-red-900">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">{editingWorker ? '인력 수정' : '새 인력 등록'}</h2>

                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">이름</label>
                                    <input name="name" type="text" defaultValue={editingWorker?.name} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">연락처</label>
                                    <input name="phone" type="text" defaultValue={editingWorker?.phone} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">주소</label>
                                    <input name="address" type="text" defaultValue={editingWorker?.address || ''} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">주민등록번호</label>
                                    <input name="residentRegistrationNumber" type="text" defaultValue={editingWorker?.residentRegistrationNumber || ''} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="000000-0000000" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">은행명</label>
                                        <input name="bank_name" type="text" defaultValue={editingWorker?.bank_name || ''} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">계좌번호</label>
                                        <input name="bank_account" type="text" defaultValue={editingWorker?.bank_account || ''} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">신분증 사본</label>
                                    <input name="resident_id_front_file" type="file" accept="image/*" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                    {editingWorker?.resident_id_front && (
                                        <a href={editingWorker.resident_id_front} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline mt-1 block">현재 등록된 신분증 보기</a>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">통장 사본</label>
                                    <input name="bankBookImage_file" type="file" accept="image/*" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                    {editingWorker?.bankBookImage && (
                                        <a href={editingWorker.bankBookImage} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline mt-1 block">현재 등록된 통장사본 보기</a>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">구분 (계약형태)</label>
                                    <select name="contract_type" defaultValue={editingWorker?.contract_type || 'Daily'} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                        <option value="Daily">비정규</option>
                                        <option value="Regular">정규</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">숙련도</label>
                                    <select name="skill_level" defaultValue={editingWorker?.skill_level || 'Novice'} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                        <option value="Novice">초급</option>
                                        <option value="Intermediate">중급</option>
                                        <option value="Expert">고급</option>
                                        <option value="Specialist">전문</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">상태</label>
                                    <select name="status" defaultValue={editingWorker?.status || 'Active'} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                        <option value="Active">활동중</option>
                                        <option value="Inactive">중단</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">비고</label>
                                    <textarea name="notes" defaultValue={editingWorker?.notes || ''} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                >
                                    저장
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
