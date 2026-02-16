'use client';

import { useState, useRef } from 'react';
import { Worker, WorkLog, Client } from '@/types';
import { X, Download, FileImage } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface WorkerSettlementModalProps {
    worker: Worker;
    clients: Client[];
    logs: WorkLog[];
    initialDateRange?: { start: string, end: string };
    onClose: () => void;
}

export default function WorkerSettlementModal({ worker, clients, logs, initialDateRange, onClose }: WorkerSettlementModalProps) {
    // Default range: This month if not provided
    const [startDate, setStartDate] = useState(initialDateRange?.start || new Date().toISOString().slice(0, 8) + '01');
    const [endDate, setEndDate] = useState(initialDateRange?.end || new Date().toISOString().slice(0, 10));

    const reportRef = useRef<HTMLDivElement>(null);

    // Filter logs for this worker and date range
    const relevantLogs = logs.filter(log => {
        return log.worker_ids.includes(worker.id) &&
            log.date >= startDate &&
            log.date <= endDate;
    }).sort((a, b) => a.date.localeCompare(b.date));

    // Calculate total
    const totalAmount = relevantLogs.reduce((sum, log) => sum + log.unit_price, 0);

    const getClientName = (clientId: string) => {
        return clients.find(c => c.id === clientId)?.name || '알 수 없음';
    };

    const handleDownloadImage = async () => {
        if (!reportRef.current) return;

        try {
            const canvas = await html2canvas(reportRef.current, {
                scale: 2, // Higher resolution
                backgroundColor: '#ffffff'
            } as any);

            const image = canvas.toDataURL('image/jpeg', 1.0);
            const link = document.createElement('a');
            link.href = image;
            link.download = `${worker.name}_정산서_${startDate}_${endDate}.jpg`;
            link.click();
        } catch (err) {
            console.error('Image generation failed', err);
            alert('이미지 생성에 실패했습니다.');
        }
    };

    const handleDownloadPDF = async () => {
        if (!reportRef.current) return;

        try {
            const canvas = await html2canvas(reportRef.current, {
                scale: 2, // Higher resolution
                backgroundColor: '#ffffff'
            } as any);

            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            // A4 size: 210mm x 297mm
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            const imgWidth = pageWidth - 20; // 10mm margin each side
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 10; // Top margin

            pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);

            // Allow multipage if long (simple implementation)
            // For now, we scale to fit or simple 1 page if fits
            if (imgHeight > pageHeight - 20) {
                // Too long, maybe just let it be or handle paging later.
                // For settlement sheets, usually 1-2 pages.
            }

            pdf.save(`${worker.name}_정산서_${startDate}_${endDate}.pdf`);
        } catch (err) {
            console.error('PDF generation failed', err);
            alert('PDF 생성에 실패했습니다.');
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full flex flex-col max-h-[90vh]">

                {/* Header Controls */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h2 className="text-lg font-bold text-gray-800">정산서 발급</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4 bg-gray-50 border-b flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-600">기간:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="border rounded px-2 py-1 text-sm"
                        />
                        <span className="text-gray-400">~</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="border rounded px-2 py-1 text-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleDownloadImage}
                            className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
                        >
                            <FileImage className="w-4 h-4" /> 이미지 저장
                        </button>
                        <button
                            onClick={handleDownloadPDF}
                            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
                        >
                            <Download className="w-4 h-4" /> PDF 다운로드
                        </button>
                    </div>
                </div>

                {/* Printable Area */}
                <div className="overflow-y-auto p-8 bg-gray-100 flex justify-center">
                    <div
                        ref={reportRef}
                        className="shadow-sm w-full max-w-[210mm] min-h-[297mm]"
                        style={{
                            padding: '40px',
                            backgroundColor: '#ffffff',
                            color: '#111827',
                            fontFamily: '"Noto Sans KR", sans-serif'
                        }}
                    >
                        {/* Report Header */}
                        <div style={{
                            textAlign: 'center',
                            marginBottom: '40px',
                            borderBottom: '3px solid #111827',
                            paddingBottom: '20px'
                        }}>
                            <h1 style={{
                                fontSize: '28px',
                                fontWeight: '800',
                                margin: '0 0 10px 0',
                                letterSpacing: '-0.5px'
                            }}>작업비 정산서</h1>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-end',
                                marginTop: '20px'
                            }}>
                                <div style={{ textAlign: 'left' }}>
                                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 2px 0' }}>성명</p>
                                    <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '0' }}>{worker.name}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 2px 0' }}>정산 기간</p>
                                    <p style={{ fontSize: '16px', fontWeight: '600', margin: '0' }}>{startDate} ~ {endDate}</p>
                                </div>
                            </div>
                        </div>

                        {/* Report Table */}
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            marginBottom: '40px',
                            fontSize: '14px'
                        }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f3f4f6' }}>
                                    <th style={{ border: '1px solid #d1d5db', padding: '12px', textAlign: 'center', width: '100px', fontWeight: 'bold' }}>날짜</th>
                                    <th style={{ border: '1px solid #d1d5db', padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>현장명 / 내용</th>
                                    <th style={{ border: '1px solid #d1d5db', padding: '12px', textAlign: 'right', width: '120px', fontWeight: 'bold' }}>지급액</th>
                                </tr>
                            </thead>
                            <tbody>
                                {relevantLogs.map((log) => (
                                    <tr key={log.id}>
                                        <td style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'center', fontSize: '13px' }}>
                                            {log.date}
                                        </td>
                                        <td style={{ border: '1px solid #d1d5db', padding: '10px' }}>
                                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>{getClientName(log.clientId)}</div>
                                            <div style={{ fontSize: '12px', color: '#4b5563' }}>
                                                {log.volume_type}
                                                {log.status !== 'Normal' && <span style={{ marginLeft: '4px', color: '#ef4444', fontWeight: 'bold' }}>({log.status === 'Waiting' ? '대기' : '취소'})</span>}
                                            </div>
                                        </td>
                                        <td style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'right', fontWeight: '500' }}>
                                            {log.unit_price.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {relevantLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="border border-gray-400 px-3 py-8 text-center text-gray-400" style={{ border: '1px solid #d1d5db', padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
                                            해당 기간의 정산 내역이 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr style={{ backgroundColor: '#f9fafb', fontWeight: 'bold' }}>
                                    <td colSpan={2} style={{ border: '1px solid #d1d5db', padding: '15px', textAlign: 'center' }}>합 계</td>
                                    <td style={{ border: '1px solid #d1d5db', padding: '15px', textAlign: 'right', fontSize: '18px', color: '#1e40af' }}>
                                        {totalAmount.toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>

                        {/* Footer Notes */}
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '30px', lineHeight: '1.5' }}>
                            <p>* 위 내용에 이상이 있을 경우 관리자에게 문의 바랍니다.</p>
                            <p>* 본 문서는 작업비 정산 증빙용으로 출력되었습니다.</p>
                            <p className="text-right mt-4 pt-4">발행일: {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
