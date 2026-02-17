'use client';


import { useState } from 'react';
import Link from 'next/link';
import { Users, Building2, Calendar, DollarSign, LayoutDashboard, Menu, X, FileSpreadsheet, Settings, Edit, Trash2, Save, XCircle } from 'lucide-react';
import { useTeam } from '@/context/TeamContext';



import { logout } from '@/app/actions';

interface NavbarProps {
    user?: any; // Using any for simplicity as User type might need importing, or { name?: string | null, ... }
}

export default function Navbar({ user }: NavbarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { teams, selectedTeam, selectTeam, addTeam, updateTeam, removeTeam } = useTeam();
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');

    // Manage Modal State
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newTeamName.trim()) {
            await addTeam(newTeamName);
            setNewTeamName('');
            setIsTeamModalOpen(false);
        }
    };

    const startEditing = (team: { id: string, name: string }) => {
        setEditingTeamId(team.id);
        setEditName(team.name);
    };

    const cancelEditing = () => {
        setEditingTeamId(null);
        setEditName('');
    };

    const saveEditing = async (id: string) => {
        if (editName.trim()) {
            await updateTeam(id, editName);
            setEditingTeamId(null);
            setEditName('');
        }
    };

    return (
        <nav className="bg-slate-800 text-white shadow-lg">
            <div className="w-full mx-auto px-4">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 flex items-center mr-2 md:mr-6">
                            <Link href="/" className="font-bold text-lg md:text-xl text-yellow-500 whitespace-nowrap">퍼플홀딩스 관리</Link>
                        </div>

                        {/* Team Selector - Desktop Only (XL+) */}
                        <div className="hidden xl:block relative mr-6">
                            <select
                                value={selectedTeam?.id || ''}
                                onChange={(e) => {
                                    if (e.target.value === 'new') {
                                        setIsTeamModalOpen(true);
                                    } else if (e.target.value === 'manage') {
                                        setIsManageModalOpen(true);
                                    } else {
                                        selectTeam(e.target.value);
                                    }
                                }}
                                className="bg-slate-700 text-white text-sm rounded-md px-3 py-1 border-none focus:ring-2 focus:ring-yellow-500"
                            >
                                {teams.map(team => (
                                    <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                                <option disabled>──────────</option>
                                <option value="ALL">🌐 전체 팀 보기 (Global)</option>
                                <option value="manage">⚙️ 팀 관리...</option>
                                <option value="new">+ 팀 추가하기...</option>
                            </select>
                        </div>

                        {/* Desktop Menu (XL+) */}
                        <div className="hidden xl:ml-4 xl:flex xl:space-x-4 whitespace-nowrap">
                            <Link href="/" className="inline-flex items-center px-2 py-1 hover:text-yellow-400 text-base">
                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                대시보드
                            </Link>
                            <Link href="/hr" className="inline-flex items-center px-2 py-1 hover:text-yellow-400 text-base">
                                <Users className="w-4 h-4 mr-2" />
                                인사관리
                            </Link>
                            <Link href="/clients" className="inline-flex items-center px-2 py-1 hover:text-yellow-400 text-base">
                                <Building2 className="w-4 h-4 mr-2" />
                                거래처관리
                            </Link>
                            <Link href="/dispatch" className="inline-flex items-center px-2 py-1 hover:text-yellow-400 text-base">
                                <Calendar className="w-4 h-4 mr-2" />
                                배차관리
                            </Link>
                            <Link href="/settlement" className="inline-flex items-center px-2 py-1 hover:text-yellow-400 text-base">
                                <DollarSign className="w-4 h-4 mr-2" />
                                정산관리
                            </Link>
                            <Link href="/data" className="inline-flex items-center px-2 py-1 hover:text-yellow-400 text-base">
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                데이터관리
                            </Link>
                        </div>
                    </div>


                    <div className="flex items-center space-x-4">
                        {user ? (
                            <div className="flex items-center">
                                {/* Username hidden to save space */}
                                <button
                                    onClick={async () => await logout()}
                                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 md:px-3 rounded text-xs md:text-base whitespace-nowrap"
                                >
                                    로그아웃
                                </button>
                            </div>
                        ) : (
                            <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 md:px-3 rounded text-xs md:text-base whitespace-nowrap">
                                로그인
                            </Link>
                        )}

                        {/* Mobile menu button */}
                        <div className="flex items-center xl:hidden ml-2">
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                            >
                                <span className="sr-only">Open main menu</span>
                                {isOpen ? (
                                    <X className="block h-6 w-6" aria-hidden="true" />
                                ) : (
                                    <Menu className="block h-6 w-6" aria-hidden="true" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile menu, show/hide based on menu state */}
            {isOpen && (
                <div className="xl:hidden bg-slate-800 pb-4">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {/* Mobile Team Selector */}
                        <div className="px-3 py-2">
                            <label className="block text-xs text-gray-400 mb-1">팀 선택</label>
                            <select
                                value={selectedTeam?.id || ''}
                                onChange={(e) => {
                                    if (e.target.value === 'new') {
                                        setIsTeamModalOpen(true);
                                    } else if (e.target.value === 'manage') {
                                        setIsManageModalOpen(true);
                                    } else {
                                        selectTeam(e.target.value);
                                        setIsOpen(false);
                                    }
                                }}
                                className="w-full bg-slate-700 text-white text-sm rounded-md px-3 py-2 border-none focus:ring-2 focus:ring-yellow-500"
                            >
                                {teams.map(team => (
                                    <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                                <option disabled>──────────</option>
                                <option value="ALL">🌐 전체 팀 보기 (Global)</option>
                                <option value="manage">⚙️ 팀 관리...</option>
                                <option value="new">+ 팀 추가하기...</option>
                            </select>
                        </div>

                        <Link href="/" className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium flex items-center" onClick={() => setIsOpen(false)}>
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            대시보드
                        </Link>
                        <Link href="/dispatch" className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium flex items-center" onClick={() => setIsOpen(false)}>
                            <Calendar className="w-4 h-4 mr-2" />
                            배차관리
                        </Link>
                        <Link href="/settlement" className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium flex items-center" onClick={() => setIsOpen(false)}>
                            <DollarSign className="w-4 h-4 mr-2" />
                            정산관리
                        </Link>
                        <Link href="/hr" className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium flex items-center" onClick={() => setIsOpen(false)}>
                            <Users className="w-4 h-4 mr-2" />
                            인사관리
                        </Link>
                        <Link href="/clients" className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium flex items-center" onClick={() => setIsOpen(false)}>
                            <Building2 className="w-4 h-4 mr-2" />
                            거래처관리
                        </Link>
                        <Link href="/data" className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium flex items-center" onClick={() => setIsOpen(false)}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            데이터관리
                        </Link>

                        {user ? (
                            <button onClick={async () => await logout()} className="w-full text-left text-red-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium mt-4 border-t border-gray-700 pt-4">
                                로그아웃
                            </button>
                        ) : (
                            <Link href="/login" className="text-blue-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium" onClick={() => setIsOpen(false)}>
                                로그인
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {/* Create Team Modal */}
            {isTeamModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-gray-900/50 transition-opacity"
                        onClick={() => setIsTeamModalOpen(false)}
                    ></div>

                    {/* Modal Panel */}
                    <div className="relative z-10 bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">
                                새로운 팀 추가
                            </h3>
                        </div>
                        <form onSubmit={handleCreateTeam} className="p-6">
                            <input
                                type="text"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 text-black mb-4 p-2 border"
                                placeholder="팀 이름 (예: 화성팀)"
                                autoFocus
                            />
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsTeamModalOpen(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 font-medium"
                                >
                                    추가하기
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Teams Modal */}
            {isManageModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-gray-900/50 transition-opacity"
                        onClick={() => setIsManageModalOpen(false)}
                    ></div>

                    {/* Modal Panel */}
                    <div className="relative z-10 bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">
                                팀 관리
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-3">
                                {teams && teams.length > 0 ? (
                                    teams.map(team => (
                                        <div key={team.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            {editingTeamId === team.id ? (
                                                <div className="flex items-center flex-1 space-x-2">
                                                    <input
                                                        type="text"
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        className="flex-1 border-gray-300 rounded px-2 py-1 text-sm text-black border"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => saveEditing(team.id)} className="text-green-600 hover:text-green-800 p-1">
                                                        <Save className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={cancelEditing} className="text-gray-500 hover:text-gray-700 p-1">
                                                        <XCircle className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="font-medium text-gray-800">{team.name}</span>
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            onClick={() => startEditing(team)}
                                                            className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                                                            title="수정"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => removeTeam(team.id)}
                                                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                                            title="삭제"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-center py-4">등록된 팀이 없습니다.</p>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsManageModalOpen(false)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
