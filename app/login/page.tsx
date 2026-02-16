
'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { authenticate } from '@/app/actions';
import { AlertCircle, ArrowRight } from 'lucide-react';

function LoginButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex justify-center items-center"
            aria-disabled={pending}
            disabled={pending}
        >
            {pending ? '로그인 중...' : '로그인'}
            {!pending && <ArrowRight className="ml-2 h-5 w-5 text-gray-50" />}
        </button>
    );
}

export default function LoginPage() {
    const [errorMessage, dispatch] = useActionState(authenticate, undefined);

    return (
        <main className="flex items-center justify-center md:h-screen bg-gray-100">
            <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md:-mt-32">
                <div className="flex w-full items-end rounded-lg bg-blue-600 p-3 md:h-36">
                    <div className="w-32 text-white md:w-36">
                        <h1 className="text-2xl font-bold">HR FI 관리자</h1>
                    </div>
                </div>
                <form action={dispatch} className="space-y-3">
                    <div className="flex-1 rounded-lg bg-white px-6 pb-4 pt-8 shadow-md">
                        <h1 className="mb-3 text-2xl font-bold text-gray-900">로그인</h1>
                        <div className="w-full">
                            <div>
                                <label
                                    className="mb-3 mt-5 block text-xs font-medium text-gray-900"
                                    htmlFor="username"
                                >
                                    아이디
                                </label>
                                <div className="relative">
                                    <input
                                        className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-3 text-sm outline-2 placeholder:text-gray-500"
                                        id="username"
                                        type="text"
                                        name="username"
                                        placeholder="아이디를 입력하세요"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label
                                    className="mb-3 mt-5 block text-xs font-medium text-gray-900"
                                    htmlFor="password"
                                >
                                    비밀번호
                                </label>
                                <div className="relative">
                                    <input
                                        className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-3 text-sm outline-2 placeholder:text-gray-500"
                                        id="password"
                                        type="password"
                                        name="password"
                                        placeholder="비밀번호를 입력하세요"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>
                        </div>
                        <LoginButton />
                        <div
                            className="flex h-8 items-end space-x-1"
                            aria-live="polite"
                            aria-atomic="true"
                        >
                            {errorMessage && (
                                <>
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                    <p className="text-sm text-red-500">{errorMessage}</p>
                                </>
                            )}
                        </div>

                        <div className="mt-4 flex justify-between text-sm">
                            <Link href="/register" className="text-blue-600 hover:text-blue-800">
                                관리자 회원가입
                            </Link>
                            <Link href="/find-account" className="text-gray-600 hover:text-gray-900">
                                아이디/비밀번호 찾기
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </main>
    );
}
