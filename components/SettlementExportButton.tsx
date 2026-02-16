
'use client';

import { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, Image as ImageIcon, FileText } from 'lucide-react';

interface SettlementExportButtonProps {
    targetId: string;
    fileName: string;
}

export default function SettlementExportButton({ targetId, fileName }: SettlementExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExportImage = async () => {
        setIsExporting(true);
        try {
            const element = document.getElementById(targetId);
            if (!element) return;

            const canvas = await html2canvas(element, {
                scale: 2, // Higher resolution
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            } as any);

            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = `${fileName}.png`;
            link.click();
        } catch (error) {
            console.error('Export failed:', error);
            alert('이미지 저장 중 오류가 발생했습니다.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            const element = document.getElementById(targetId);
            if (!element) return;

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            } as any);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4',
            });

            const imgProps = { width: canvas.width, height: canvas.height };
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${fileName}.pdf`);
        } catch (error) {
            console.error('Export failed:', error);
            alert('PDF 저장 중 오류가 발생했습니다.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex space-x-2">
            <button
                onClick={handleExportImage}
                disabled={isExporting}
                className="flex items-center px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 text-sm font-medium"
            >
                {isExporting ? '처리중...' : (
                    <>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        이미지 저장
                    </>
                )}
            </button>
            <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
            >
                {isExporting ? '처리중...' : (
                    <>
                        <FileText className="w-4 h-4 mr-2" />
                        PDF 저장
                    </>
                )}
            </button>
        </div>
    );
}
