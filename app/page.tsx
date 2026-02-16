
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <h1 className="text-4xl font-bold text-gray-800">HR Financial Intelligence</h1>
      <p className="text-xl text-gray-600">인력 사무소 관리 시스템</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <Link href="/dispatch" className="p-6 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition text-center font-bold text-lg">
          일일 배차 관리
        </Link>
        <Link href="/settlement" className="p-6 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition text-center font-bold text-lg">
          정산 대시보드
        </Link>
        <Link href="/hr" className="p-6 bg-purple-500 text-white rounded-lg shadow hover:bg-purple-600 transition text-center font-bold text-lg">
          인력 정보 관리
        </Link>
        <Link href="/data" className="p-6 bg-gray-500 text-white rounded-lg shadow hover:bg-gray-600 transition text-center font-bold text-lg">
          기초 데이터 관리
        </Link>
      </div>
    </div>
  );
}
