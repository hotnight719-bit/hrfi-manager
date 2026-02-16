import Link from 'next/link';
import { X } from 'lucide-react';

export default function CloseButton() {
    return (
        <Link
            href="/"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="닫기 (대시보드로 이동)"
        >
            <X className="w-6 h-6" />
        </Link>
    );
}
