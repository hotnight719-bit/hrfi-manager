import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WorkLog } from '@/types';

interface CalendarProps {
    selectedDate: string;
    onSelectDate: (date: string) => void;
    logs: WorkLog[];
}

export default function Calendar({ selectedDate, onSelectDate, logs }: CalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

    // Get First Day of Month
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)

    // Get Days in Month
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

    // Previous Month Days (for padding)
    const prevMonthDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();

    // Generate Calendar Grid
    const calendarDays = useMemo(() => {
        const days = [];

        // Previous Month Padding
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            days.push({
                date: new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, prevMonthDays - i),
                isCurrentMonth: false
            });
        }

        // Current Month Days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i),
                isCurrentMonth: true
            });
        }

        // Next Month Padding (to fill 6 rows = 42 cells)
        const remainingCells = 42 - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            days.push({
                date: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, i),
                isCurrentMonth: false
            });
        }

        return days;
    }, [currentMonth, startDayOfWeek, daysInMonth, prevMonthDays]);

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const formatDate = (date: Date) => {
        // YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    return (
        <div className="bg-white rounded-lg shadow border border-gray-200">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-full">
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="text-lg font-bold text-gray-800">
                    {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                </h2>
                <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-full">
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 text-center text-xs text-gray-500 font-medium py-2 border-b bg-gray-50">
                <div className="text-red-500">일</div>
                <div>월</div>
                <div>화</div>
                <div>수</div>
                <div>목</div>
                <div>금</div>
                <div className="text-blue-500">토</div>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 text-sm">
                {calendarDays.map((dayObj, index) => {
                    const dateStr = formatDate(dayObj.date);
                    const isSelected = dateStr === selectedDate;
                    const isToday = dateStr === formatDate(new Date());

                    // Check for logs on this date
                    const dayLogs = logs.filter(log => log.date === dateStr);
                    const hasLogs = dayLogs.length > 0;

                    // Determine dot color priority: Cancelled(Red) > Waiting(Orange) > Normal(Blue)
                    // Or prioritize Normal? Maybe just show distinct dots if simplified, or single dot.
                    // User asked for "dot". Let's use blue for normal, orange for waiting, red for cancelled.
                    // If multiple, show the most critical or multiple dots? Single dot logic for simplicity.
                    // Priority: Cancelled -> Waiting -> Normal
                    if (hasLogs) {
                        if (dayLogs.some(l => l.status === 'Cancelled')) { /* dotColor = 'bg-red-500'; */ }
                        else if (dayLogs.some(l => l.status === 'Waiting')) { /* dotColor = 'bg-orange-500'; */ }
                        else { /* dotColor = 'bg-blue-500'; */ }
                    }

                    return (
                        <div
                            key={index}
                            onClick={() => onSelectDate(dateStr)}
                            className={`
                                h-24 border-b border-r p-1 relative cursor-pointer hover:bg-gray-50 transition-colors
                                ${!dayObj.isCurrentMonth ? 'text-gray-300 bg-gray-50/50' : 'text-gray-900'}
                                ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-500 z-10' : ''}
                            `}
                        >
                            <div className={`
                                w-6 h-6 flex items-center justify-center rounded-full text-xs mb-1
                                ${isToday ? 'bg-blue-600 text-white font-bold' : ''}
                                ${(index % 7 === 0) ? 'text-red-500' : (index % 7 === 6 ? 'text-blue-500' : '')}
                            `}>
                                {dayObj.date.getDate()}
                            </div>

                            <div className="flex flex-col gap-1 items-start pl-1 overflow-hidden">
                                {hasLogs && (
                                    <div className="absolute bottom-1 right-1">
                                        <div className={`
                                            px-1.5 py-0.5 rounded-md text-xs font-bold text-white shadow-sm
                                            ${dayLogs.some(l => l.status === 'Cancelled') ? 'bg-red-500' :
                                                (dayLogs.some(l => l.status === 'Waiting') ? 'bg-orange-500' : 'bg-blue-600')}
                                        `}>
                                            {dayLogs.length}건
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
