'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Client } from '@/types';
import { updateClientRatesAction } from '@/app/actions';
import { Upload, FileSpreadsheet, Save, CheckCircle, AlertCircle, Download } from 'lucide-react';

interface DataManagementProps {
    initialClients: Client[];
}

interface RowData {
    'Client ID': string;
    'Client Name': string;
    'Volume Type': string;
    'Current Rate (Unit)': number | string;
    'New Rate (Unit)': number | string;
    'Rate ID': string;
}

interface PreviewItem {
    clientName: string;
    volumeType: string;
    oldRate: number;
    newRate: number;
    rateId: string;
    clientId: string;
}

export default function DataManagement({ initialClients }: DataManagementProps) {
    const [previewData, setPreviewData] = useState<PreviewItem[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    // 1. Download Template
    const handleDownloadTemplate = () => {
        // Flatten client rates for Excel
        const rows: RowData[] = [];
        initialClients.forEach(client => {
            client.rates.forEach(rate => {
                rows.push({
                    'Client ID': client.id,
                    'Client Name': client.name,
                    'Volume Type': rate.volume_type as string,
                    'Current Rate (Unit)': rate.rate_per_person, // e.g. 15.0
                    'New Rate (Unit)': rate.rate_per_person, // User edits this
                    'Rate ID': rate.id
                });
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Rates");
        XLSX.writeFile(workbook, "Client_Rates_Template.xlsx");
    };

    // 2. Handle File Upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws) as RowData[];

            console.log("Parsed Data:", data);

            // Compare and prepare preview
            const changes: PreviewItem[] = [];

            data.forEach((row: RowData) => {
                const rateId = row['Rate ID'];
                const newRate = typeof row['New Rate (Unit)'] === 'number' ? row['New Rate (Unit)'] : parseFloat(row['New Rate (Unit)'].toString());
                const currentRate = typeof row['Current Rate (Unit)'] === 'number' ? row['Current Rate (Unit)'] : parseFloat(row['Current Rate (Unit)'].toString());

                // Find original to verify
                const client = initialClients.find(c => c.id === row['Client ID']);
                if (client && rateId && !isNaN(newRate) && newRate !== currentRate) {
                    changes.push({
                        clientName: client.name,
                        volumeType: row['Volume Type'],
                        oldRate: currentRate,
                        newRate: newRate,
                        rateId: rateId,
                        clientId: client.id
                    });
                }
            });

            setPreviewData(changes);
            if (changes.length === 0) {
                setMessage('변경 사항이 없거나 형식이 올바르지 않습니다.');
                setUploadStatus('error');
            } else {
                setMessage(`${changes.length}건의 변경 사항이 발견되었습니다.`);
                setUploadStatus('idle');
            }
        };
        reader.readAsBinaryString(file);
    };

    // 3. Apply Changes
    const handleApplyChanges = async () => {
        if (previewData.length === 0) return;
        setIsUploading(true);
        try {
            // Group updates by client? Or just send bulk list?
            // Let's send a list of { clientId, rateId, newRate }
            const updates = previewData.map(d => ({
                clientId: d.clientId,
                rateId: d.rateId,
                newRate: d.newRate
            }));

            await updateClientRatesAction(updates);

            setUploadStatus('success');
            setMessage('성공적으로 업데이트되었습니다. 페이지를 새로고침합니다.');
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error(error);
            setUploadStatus('error');
            setMessage('업데이트 중 오류가 발생했습니다.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-8">
            <div className="border-b pb-4">
                <h2 className="text-xl font-bold flex items-center">
                    <FileSpreadsheet className="w-6 h-6 mr-2 text-green-600" />
                    거래처 단가 일괄 수정
                </h2>
                <p className="text-gray-500 mt-2 text-sm">
                    1. 템플릿을 다운로드하세요.<br />
                    2. 엑셀 파일에서 &apos;New Rate (Unit)&apos; 열의 값을 수정하세요.<br />
                    3. 수정된 파일을 업로드하고 적용하세요.
                </p>
                <button
                    onClick={handleDownloadTemplate}
                    className="mt-4 bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 flex items-center text-sm font-medium"
                >
                    <Download className="w-4 h-4 mr-2" />
                    엑셀 템플릿 다운로드
                </button>
            </div>

            <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">엑셀 파일 업로드</label>
                <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-3 text-gray-400" />
                            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">클릭하여 업로드</span></p>
                            <p className="text-xs text-gray-500">XLSX 파일형식 지원</p>
                        </div>
                        <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                    </label>
                </div>
            </div>

            {/* Preview Section */}
            {previewData.length > 0 && (
                <div className="mt-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2 text-blue-500" />
                        변경 사항 미리보기 ({previewData.length}건)
                    </h3>
                    <div className="overflow-x-auto max-h-60 overflow-y-auto border rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">거래처</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">단가 유형</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">기존 단가</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">변경 단가</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {previewData.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-2 text-sm text-gray-900">{item.clientName}</td>
                                        <td className="px-4 py-2 text-sm text-gray-500">{item.volumeType}</td>
                                        <td className="px-4 py-2 text-sm text-gray-500 text-right">{item.oldRate}</td>
                                        <td className="px-4 py-2 text-sm font-bold text-blue-600 text-right">{item.newRate}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 flex justify-end items-center space-x-4">
                        {message && <span className={`text-sm ${uploadStatus === 'error' ? 'text-red-500' : 'text-green-600'}`}>{message}</span>}
                        <button
                            onClick={handleApplyChanges}
                            disabled={isUploading}
                            className={`flex items-center px-6 py-3 rounded-lg text-white font-bold 
                                ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {isUploading ? '업데이트 중...' : '변경 사항 적용하기'}
                            {!isUploading && <Save className="w-5 h-5 ml-2" />}
                        </button>
                    </div>
                </div>
            )}

            {uploadStatus === 'error' && previewData.length === 0 && message && (
                <div className="flex items-center text-red-500 mt-4 bg-red-50 p-3 rounded">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {message}
                </div>
            )}
        </div>
    );
}
