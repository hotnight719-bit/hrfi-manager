'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Team } from '@/types';
import { createTeamAction, updateTeamAction, deleteTeamAction } from '@/app/actions';
import { useRouter } from 'next/navigation';

// Define context shape
interface TeamContextType {
    teams: Team[];
    selectedTeam: Team | null;
    selectTeam: (teamId: string) => void;
    addTeam: (name: string) => Promise<void>;
    updateTeam: (id: string, name: string) => Promise<void>;
    removeTeam: (id: string) => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children, initialTeams }: { children: ReactNode, initialTeams: Team[] }) {
    const [teams, setTeams] = useState<Team[]>(initialTeams);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(
        initialTeams.length > 0 ? initialTeams[0] : null
    );
    const router = useRouter();

    useEffect(() => {
        setTeams(initialTeams);
    }, [initialTeams]);

    useEffect(() => {
        // Load selected team from localStorage if available
        const savedTeamId = localStorage.getItem('selectedTeamId');
        if (savedTeamId) {
            if (savedTeamId === 'ALL') {
                setSelectedTeam({ id: 'ALL', name: '전체 팀 보기' });
            } else {
                const found = teams.find(t => t.id === savedTeamId);
                if (found) {
                    setSelectedTeam(found);
                }
            }
        }
    }, [teams]); // Run when teams change too, e.g. initial load

    const selectTeam = (teamId: string) => {
        if (teamId === 'ALL') {
            setSelectedTeam({ id: 'ALL', name: '전체 팀 보기' });
            localStorage.setItem('selectedTeamId', 'ALL');
            document.cookie = `teamId=ALL; path=/; max-age=31536000`;
            router.refresh();
            return;
        }

        const team = teams.find(t => t.id === teamId);
        if (team) {
            setSelectedTeam(team);
            localStorage.setItem('selectedTeamId', team.id);

            // Set cookie for Server Components
            document.cookie = `teamId=${team.id}; path=/; max-age=31536000`;

            // Refresh Server Components
            router.refresh();
        }
    };


    const addTeam = async (name: string) => {
        try {
            const newTeam = await createTeamAction(name);
            setTeams(prev => [...prev, newTeam]);

            // Manually select since finding in state won't work immediately
            setSelectedTeam(newTeam);
            localStorage.setItem('selectedTeamId', newTeam.id);
            document.cookie = `teamId=${newTeam.id}; path=/; max-age=31536000`;
            // router.refresh(); // Removed to prevent potential crash
        } catch (error) {
            console.error("Failed to create team:", error);
            alert("팀 생성에 실패했습니다. 이미 존재하는 팀 이름일 수 있습니다.");
        }
    };

    const updateTeam = async (id: string, name: string) => {
        try {
            const updated = await updateTeamAction(id, name);
            setTeams(teams.map(t => t.id === id ? updated : t));
            if (selectedTeam?.id === id) {
                setSelectedTeam(updated);
            }
        } catch (error) {
            console.error("Failed to update team:", error);
            alert("팀 수정에 실패했습니다.");
        }
    };

    const removeTeam = async (id: string) => {
        if (!confirm("정말로 팀을 삭제하시겠습니까? 관련 데이터(인력, 거래처 등)가 모두 삭제될 수 있습니다.")) return;
        try {
            await deleteTeamAction(id);
            const newTeams = teams.filter(t => t.id !== id);
            setTeams(newTeams);
            if (selectedTeam?.id === id) {
                if (newTeams.length > 0) {
                    selectTeam(newTeams[0].id);
                } else {
                    setSelectedTeam(null);
                    localStorage.removeItem('selectedTeamId');
                    document.cookie = `teamId=; path=/; max-age=0`;
                }
            }
        } catch (error) {
            console.error("Failed to delete team:", error);
            alert("팀 삭제에 실패했습니다.");
        }
    };

    return (
        <TeamContext.Provider value={{ teams, selectedTeam, selectTeam, addTeam, updateTeam, removeTeam }}>
            {children}
        </TeamContext.Provider>
    );
}

export function useTeam() {
    const context = useContext(TeamContext);
    if (context === undefined) {
        throw new Error('useTeam must be used within a TeamProvider');
    }
    return context;
}
