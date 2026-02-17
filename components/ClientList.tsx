'use client';

import { useState, Fragment } from 'react';
import { Client, Rate } from '@/types';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';

import { createClientAction, updateClientAction, deleteClientAction } from '@/app/actions';
import { useTeam } from '@/context/TeamContext';

interface ClientListProps {
    initialClients: Client[];
}

export default function ClientList({ initialClients }: ClientListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);


    const { selectedTeam } = useTeam();
    const isGlobalMode = selectedTeam?.id === 'ALL';

    // Form state for Rates (since it's complex nested data)
    const [formRates, setFormRates] = useState<Rate[]>([]);
    const [formOwnerNames, setFormOwnerNames] = useState<string[]>([]);
    const [formRegNumbers, setFormRegNumbers] = useState<string[]>([]);

    // Filter clients
    const filteredClients = initialClients.filter(c =>
        c.name.includes(searchTerm) || c.address?.includes(searchTerm)
    );

    const openModal = (client: Client | null) => {
        setEditingClient(client);
        setFormRates(client ? [...client.rates] : []);
        setFormOwnerNames(client?.businessOwnerNames || ['']);
        setFormRegNumbers(client?.businessRegistrationNumbers || ['']);
        setIsModalOpen(true);
    };

    const handleAddRate = () => {
        setFormRates([...formRates, {
            id: Math.random().toString(36).substr(2, 9),
            volume_type: '40ft',
            headcount: 2,
            rate_per_person: 0,
            notes: ''
        }]);
    };

    const handleRemoveRate = (index: number) => {
        const newRates = [...formRates];
        newRates.splice(index, 1);
        setFormRates(newRates);
    };

    const handleRateChange = (index: number, field: keyof Rate, value: string | number) => {
        const newRates = [...formRates];
        newRates[index] = { ...newRates[index], [field]: value };
        setFormRates(newRates);
    };

    const handleAddOwnerName = () => setFormOwnerNames([...formOwnerNames, '']);
    const handleRemoveOwnerName = (index: number) => {
        const newNames = [...formOwnerNames];
        newNames.splice(index, 1);
        setFormOwnerNames(newNames);
    };
    const handleOwnerNameChange = (index: number, value: string) => {
        const newNames = [...formOwnerNames];
        newNames[index] = value;
        setFormOwnerNames(newNames);
    };

    const handleAddRegNumber = () => setFormRegNumbers([...formRegNumbers, '']);
    const handleRemoveRegNumber = (index: number) => {
        const newNumbers = [...formRegNumbers];
        newNumbers.splice(index, 1);
        setFormRegNumbers(newNumbers);
    };
    const handleRegNumberChange = (index: number, value: string) => {
        const newNumbers = [...formRegNumbers];
        newNumbers[index] = value;
        setFormRegNumbers(newNumbers);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        let businessRegistrationImages: string[] = editingClient?.businessRegistrationImages || [];
        const files = formData.getAll('businessRegistrationImages') as File[]; // Use getAll for multiple files

        // Helper to upload a single file
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

        const newUrls: string[] = [];
        for (const file of files) {
            if (file.size > 0) {
                const url = await uploadFile(file);
                if (url) newUrls.push(url);
            }
        }

        if (newUrls.length > 0) {
            businessRegistrationImages = [...businessRegistrationImages, ...newUrls];
        }


        const clientData: Omit<Client, 'id'> = {
            name: formData.get('name') as string,
            address: formData.get('address') as string,
            manager: formData.get('manager') as string,
            commission_type: 'PerPerson',
            fee_per_person: parseInt(formData.get('fee_per_person') as string) || 0,
            commission_rate: 0,
            rates: formRates,
            teamId: selectedTeam?.id === 'ALL' ? '' : (selectedTeam?.id || ''),
            contact_info: undefined,
            businessRegistrationImages: businessRegistrationImages,
            businessOwnerNames: formOwnerNames.filter(n => n.trim() !== ''),
            businessRegistrationNumbers: formRegNumbers.filter(n => n.trim() !== ''),
            taxInvoiceEmail: formData.get('taxInvoiceEmail') as string,
            payType: formData.get('payType') as 'INDIVIDUAL' | 'TOTAL',
        };

        try {
            if (editingClient) {
                await updateClientAction(editingClient.id, clientData);
            } else {
                await createClientAction(clientData);
            }
            setIsModalOpen(false);
            window.location.reload();
        } catch (error) {
            alert('오류가 발생했습니다: ' + error);
        }
    };

    const handleDeleteClient = async (id: string, name: string) => {
        if (confirm(`${name} 업체를 정말 삭제하시겠습니까?\n관련된 단가 정보도 모두 삭제됩니다.`)) {
            try {
                await deleteClientAction(id);
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
                        placeholder="업체명/주소 검색..."
                        className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                </div>
                <button
                    onClick={() => {
                        if (isGlobalMode) {
                            alert('전체 팀 보기 모드에서는 거래처를 등록할 수 없습니다. 특정 팀을 선택해주세요.');
                            return;
                        }
                        openModal(null);
                    }}
                    className={`flex items-center px-4 py-2 rounded-lg ${isGlobalMode ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                    disabled={isGlobalMode}
                >
                    <Plus className="w-5 h-5 mr-2" />
                    거래처 등록
                </button>
            </div>

            {/* List / Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                    <thead className="bg-gray-100">
                        <tr>
                            {isGlobalMode && <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-300 whitespace-nowrap">팀</th>}
                            <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-300 whitespace-nowrap">업체명</th>
                            <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-300 whitespace-nowrap">주소</th>
                            <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-300 whitespace-nowrap">관리자</th>

                            <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-300 whitespace-nowrap">용량(피트)</th>
                            <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-300 whitespace-nowrap">작업인원</th>
                            <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-300 whitespace-nowrap">작업비</th>
                            <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-300 whitespace-nowrap">세금계산서 정보</th>
                            <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-300 whitespace-nowrap">관리</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {filteredClients.map((client) => {
                            const rowCount = Math.max(client.rates.length, 1);
                            return (
                                <Fragment key={client.id}>
                                    {client.rates.length > 0 ? (
                                        client.rates.map((rate, idx) => (
                                            <tr key={`${client.id}-${idx}`} className="hover:bg-gray-50">
                                                {/* Client Info - Render only on first row */}
                                                {idx === 0 && (
                                                    <>
                                                        {isGlobalMode && (
                                                            <td className="px-4 py-4 border border-gray-300 align-middle text-center whitespace-nowrap" rowSpan={rowCount}>
                                                                <span className="px-2 py-1 rounded text-xs font-semibold bg-indigo-100 text-indigo-800">
                                                                    {client.team?.name || 'Unknown'}
                                                                </span>
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-4 border border-gray-300 align-middle text-left whitespace-nowrap" rowSpan={rowCount}>
                                                            <div className="font-bold text-gray-900">{client.name}</div>
                                                        </td>
                                                        <td className="px-4 py-4 border border-gray-300 align-middle text-left text-sm text-gray-900 min-w-[200px]" rowSpan={rowCount}>
                                                            {client.address}
                                                        </td>
                                                        <td className="px-4 py-4 border border-gray-300 align-middle text-center text-sm text-gray-900 whitespace-nowrap" rowSpan={rowCount}>
                                                            {client.manager}
                                                        </td>

                                                    </>
                                                )}

                                                {/* Rate Info */}
                                                <td className="px-4 py-2 border border-gray-300 text-center text-sm text-gray-900 whitespace-nowrap">{rate.volume_type}</td>
                                                <td className="px-4 py-2 border border-gray-300 text-center text-sm text-gray-900 whitespace-nowrap">{rate.headcount}명</td>
                                                <td className="px-4 py-2 border border-gray-300 text-right text-sm text-gray-900 whitespace-nowrap px-8">{rate.rate_per_person.toLocaleString()}</td>

                                                {/* Invoice Info - Render only on first row */}
                                                {idx === 0 && (
                                                    <td className="px-4 py-2 border border-gray-300 text-left text-sm text-gray-500 min-w-[150px]" rowSpan={rowCount}>
                                                        <div className="flex flex-col space-y-1">
                                                            {client.taxInvoiceEmail && (
                                                                <span className="text-xs">✉ {client.taxInvoiceEmail}</span>
                                                            )}
                                                            {client.businessOwnerNames && client.businessOwnerNames.length > 0 && (
                                                                <span className="text-xs">대표: {client.businessOwnerNames.join(', ')}</span>
                                                            )}
                                                            {client.businessRegistrationNumbers && client.businessRegistrationNumbers.length > 0 && (
                                                                <span className="text-xs">사업자: {client.businessRegistrationNumbers.join(', ')}</span>
                                                            )}

                                                            {client.businessRegistrationImages && client.businessRegistrationImages.length > 0 ? (
                                                                <div className="flex flex-col">
                                                                    {client.businessRegistrationImages.map((url, i) => (
                                                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs underline">
                                                                            사업자등록증 {i + 1}
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400 text-xs">사업자등록증 미등록</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}

                                                {/* Actions - Render only on first row */}
                                                {idx === 0 && (
                                                    <td className="px-4 py-4 text-center border border-gray-300 align-middle whitespace-nowrap" rowSpan={rowCount}>
                                                        <div className="flex justify-center space-x-2">
                                                            <button onClick={() => openModal(client)} className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded">
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => handleDeleteClient(client.id, client.name)} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    ) : (
                                        // Case: No rates
                                        <tr key={client.id} className="hover:bg-gray-50">
                                            {isGlobalMode && (
                                                <td className="px-4 py-4 border border-gray-300 text-center whitespace-nowrap">
                                                    <span className="px-2 py-1 rounded text-xs font-semibold bg-indigo-100 text-indigo-800">
                                                        {client.team?.name || 'Unknown'}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="px-4 py-4 border border-gray-300 text-left font-bold text-gray-900 whitespace-nowrap">{client.name}</td>
                                            <td className="px-4 py-4 border border-gray-300 text-left text-sm text-gray-500 min-w-[200px]">{client.address}</td>
                                            <td className="px-4 py-4 border border-gray-300 text-center text-sm text-gray-500 whitespace-nowrap">{client.manager}</td>
                                            <td className="px-4 py-2 border border-gray-300 text-sm text-gray-400 italic text-center" colSpan={3}>등록된 단가표 없음</td>
                                            <td className="px-4 py-2 border border-gray-300 text-left text-sm text-gray-500 min-w-[150px]">
                                                <div className="flex flex-col space-y-1">
                                                    {client.taxInvoiceEmail && (
                                                        <span className="text-xs">✉ {client.taxInvoiceEmail}</span>
                                                    )}
                                                    {client.businessOwnerNames && client.businessOwnerNames.length > 0 && (
                                                        <span className="text-xs">대표: {client.businessOwnerNames.join(', ')}</span>
                                                    )}
                                                    {client.businessRegistrationNumbers && client.businessRegistrationNumbers.length > 0 && (
                                                        <span className="text-xs">사업자: {client.businessRegistrationNumbers.join(', ')}</span>
                                                    )}

                                                    {client.businessRegistrationImages && client.businessRegistrationImages.length > 0 ? (
                                                        <div className="flex flex-col">
                                                            {client.businessRegistrationImages.map((url, i) => (
                                                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs underline">
                                                                    사업자등록증 {i + 1}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">사업자등록증 미등록</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center border border-gray-300 whitespace-nowrap">
                                                <div className="flex justify-center space-x-2">
                                                    <button onClick={() => openModal(client)} className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteClient(client.id, client.name)} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Detail/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">{editingClient ? '거래처 수정' : '새 거래처 등록'}</h2>

                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">업체명</label>
                                    <input name="name" type="text" defaultValue={editingClient?.name} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">관리자</label>
                                    <input name="manager" type="text" defaultValue={editingClient?.manager || ''} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">주소</label>
                                    <input name="address" type="text" defaultValue={editingClient?.address || ''} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>

                                <div className="col-span-2 bg-blue-50 p-4 rounded-md border border-blue-100 mb-2">
                                    <label className="block text-sm font-bold text-blue-900 mb-2">수수료/단가 적용 방식</label>
                                    <div className="flex space-x-6">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="payType"
                                                value="INDIVIDUAL"
                                                checked={(editingClient?.payType || 'INDIVIDUAL') === 'INDIVIDUAL'}
                                                onChange={() => setEditingClient(prev => prev ? ({ ...prev, payType: 'INDIVIDUAL' }) : null)}
                                                className="form-radio h-4 w-4 text-blue-600"
                                            />
                                            <span className="text-sm text-gray-800">인당 적용 (기본)</span>
                                            <span className="text-xs text-gray-500 ml-1">- 단가와 수수료를 작업 인원만큼 곱합니다.</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="payType"
                                                value="TOTAL"
                                                checked={editingClient?.payType === 'TOTAL'}
                                                onChange={() => setEditingClient(prev => prev ? ({ ...prev, payType: 'TOTAL' }) : null)}
                                                className="form-radio h-4 w-4 text-blue-600"
                                            />
                                            <span className="text-sm text-gray-800">건당(전체) 적용</span>
                                            <span className="text-xs text-gray-500 ml-1">- 전체 금액에서 수수료를 한 번만 뻅니다.</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        수수료 ({editingClient?.payType === 'TOTAL' ? '전체' : '인당'})
                                    </label>
                                    <input
                                        name="fee_per_person"
                                        type="number"
                                        value={editingClient?.fee_per_person || ''}
                                        onChange={(e) => setEditingClient(prev => prev ? ({ ...prev, fee_per_person: parseInt(e.target.value) || 0 }) : null)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        placeholder="수수료 (원)"
                                    />
                                </div>
                                {/* New Fields */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">세금계산서 이메일</label>
                                    <input name="taxInvoiceEmail" type="email" defaultValue={editingClient?.taxInvoiceEmail || ''} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="example@email.com" />
                                </div>

                            </div>

                            {/* Representative Names */}
                            <div className="mt-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">대표자 성명</label>
                                {formOwnerNames.map((name, index) => (
                                    <div key={index} className="flex mb-2">
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => handleOwnerNameChange(index, e.target.value)}
                                            className="flex-1 p-2 border rounded mr-2"
                                            placeholder="대표자 성명"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveOwnerName(index)}
                                            className="bg-red-100 text-red-600 px-3 rounded hover:bg-red-200"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={handleAddOwnerName}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                    + 대표자 추가
                                </button>
                            </div>

                            {/* Registration Numbers */}
                            <div className="mt-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">사업자등록번호</label>
                                {formRegNumbers.map((num, index) => (
                                    <div key={index} className="flex mb-2">
                                        <input
                                            type="text"
                                            value={num}
                                            onChange={(e) => handleRegNumberChange(index, e.target.value)}
                                            className="flex-1 p-2 border rounded mr-2"
                                            placeholder="000-00-00000"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveRegNumber(index)}
                                            className="bg-red-100 text-red-600 px-3 rounded hover:bg-red-200"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={handleAddRegNumber}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                    + 사업자등록번호 추가
                                </button>
                            </div>

                            {/* Business Registration Image */}
                            <div className="mt-6">
                                <label className="block text-sm font-medium text-gray-700">사업자등록증 (이미지)</label>
                                <input
                                    name="businessRegistrationImages"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                {editingClient?.businessRegistrationImages && editingClient.businessRegistrationImages.length > 0 && (
                                    <div className="mt-2 flex flex-col space-y-1">
                                        <p className="text-sm text-gray-500">현재 등록된 파일:</p>
                                        {editingClient.businessRegistrationImages.map((url, i) => (
                                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">
                                                파일 {i + 1} 보기
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Rates Section */}
                            <div className="mt-8">
                                <h3 className="text-lg font-medium mb-2">단가표 관리</h3>
                                {formRates.map((rate, index) => (
                                    <div key={index} className="flex items-end space-x-2 mb-2 p-2 border rounded bg-gray-50">
                                        <div>
                                            <label className="block text-xs text-gray-500">용량</label>
                                            <select
                                                value={rate.volume_type}
                                                onChange={(e) => handleRateChange(index, 'volume_type', e.target.value)}
                                                className="p-1 border rounded"
                                            >
                                                <option value="20ft">20ft</option>
                                                <option value="40ft">40ft</option>
                                                <option value="Other">기타</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500">작업인원수</label>
                                            <input
                                                type="number"
                                                value={rate.headcount || ''}
                                                onChange={(e) => handleRateChange(index, 'headcount', parseInt(e.target.value) || 0)}
                                                className="w-16 p-1 border rounded"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500">
                                                {editingClient?.payType === 'TOTAL' ? '단가(전체)' : '단가(인당)'}
                                            </label>
                                            <input
                                                type="number"
                                                value={rate.rate_per_person || ''}
                                                onChange={(e) => handleRateChange(index, 'rate_per_person', parseInt(e.target.value) || 0)}
                                                className="w-24 p-1 border rounded"
                                            />
                                        </div>
                                        <div className="flex items-center text-xs text-gray-500 ml-2 mt-6">
                                            {editingClient?.payType === 'TOTAL' ? (
                                                <span>= 청구: {(rate.rate_per_person || 0).toLocaleString()}원</span>
                                            ) : (
                                                <span>
                                                    = 청구(총액): {(((rate.rate_per_person || 0) + (editingClient?.fee_per_person || 0)) * (rate.headcount || 1)).toLocaleString()}원
                                                    <span className="text-gray-400 ml-1">
                                                        ({((rate.rate_per_person || 0) + (editingClient?.fee_per_person || 0)).toLocaleString()}원 × {rate.headcount}명)
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveRate(index)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={handleAddRate}
                                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                                >
                                    + 단가 추가
                                </button>
                            </div>


                            <div className="mt-8 flex justify-end space-x-3">
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
