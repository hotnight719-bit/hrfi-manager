
'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function FindAccountPage() {
    return (
        <main className="flex items-center justify-center md:h-screen bg-gray-100 p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">계정 찾기</h1>
                    <p className="text-gray-600 mt-2">아이디 또는 비밀번호를 잊으셨나요?</p>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                    <p className="text-sm text-blue-700">
                        현재 시스템은 <strong>이메일/휴대폰 연동이 되어있지 않아</strong> 자동 찾기 기능을 제공하지 않습니다.
                    </p>
                    <p className="text-sm text-blue-700 mt-2">
                        시스템 관리자에게 문의하여 비밀번호 초기화를 요청해주세요.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="text-sm text-gray-600">
                        <strong>시스템 관리자 연락처:</strong>
                        <ul className="list-disc pl-5 mt-1">
                            <li>010-1234-5678 (예시)</li>
                            <li>admin@example.com</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8">
                    <Link
                        href="/login"
                        className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        로그인 페이지로 돌아가기
                    </Link>
                </div>
            </div>
        </main>
    );
}
