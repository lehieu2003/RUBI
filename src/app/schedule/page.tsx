'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import {
  CalendarGrid,
  type SchedulePerson,
  type Shift,
} from '@/components/schedule/calendar-grid';

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMonday(date: Date): Date {
  const monday = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = monday.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setUTCDate(monday.getUTCDate() + diff);
  return monday;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getIsoWeek(date: Date): number {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function formatWeekLabel(weekStart: Date): string {
  const day = String(weekStart.getUTCDate()).padStart(2, '0');
  const month = String(weekStart.getUTCMonth() + 1).padStart(2, '0');
  const year = weekStart.getUTCFullYear();
  return `Tuần ${getIsoWeek(weekStart)} — ${day}/${month}/${year}`;
}

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [people, setPeople] = useState<SchedulePerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingCell, setPendingCell] = useState<string | null>(null);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => toDateOnly(addDays(weekStart, index))),
    [weekStart]
  );
  const weekStartParam = toDateOnly(weekStart);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`${API_ENDPOINTS.SCHEDULE.ASSIGNMENTS}?week=${weekStartParam}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Không thể tải lịch trình');
      }
      setPeople(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tải lịch trình';
      setLoadError(message);
      setPeople([]);
      toast({ type: 'error', title: 'Lỗi', message });
    } finally {
      setLoading(false);
    }
  }, [weekStartParam]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const saveAssignment = async (
    userId: string,
    shiftDate: string,
    shift: Shift | null,
    removeShift?: Shift
  ) => {
    const cellKey = `${shift ?? 'REMOVE'}:${shiftDate}`;
    setPendingCell(cellKey);

    try {
      const response = await fetch(API_ENDPOINTS.SCHEDULE.ASSIGNMENTS, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, shift, removeShift, shiftDate }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Không thể cập nhật lịch trình');
      }

      setPeople((previous) =>
        previous.map((person) => {
          if (person.id !== userId) return person;
          const shifts = person.shifts.filter(
            (assignment) => assignment.shiftDate !== shiftDate || assignment.shift !== (removeShift ?? shift)
          );
          return {
            ...person,
            shifts: shift ? [...shifts, { shiftDate, shift }] : shifts,
          };
        })
      );
    } catch (error) {
      toast({
        type: 'error',
        title: 'Lỗi',
        message: error instanceof Error ? error.message : 'Không thể cập nhật lịch trình',
      });
    } finally {
      setPendingCell(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <Sidebar />

      <main className="pl-64">
        <div className="p-8">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3 text-blue-400">
                <CalendarDays className="h-5 w-5" />
                <span className="text-sm font-semibold">Lịch trình tuần</span>
              </div>
              <h1 className="text-3xl font-black text-white">{formatWeekLabel(weekStart)}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setWeekStart((current) => addDays(current, -7))}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Tuần trước"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setWeekStart(getMonday(new Date()))}
                className="h-10 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 text-sm font-semibold text-blue-300 transition-colors hover:bg-blue-500/20"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => setWeekStart((current) => addDays(current, 7))}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Tuần sau"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {loading ? (
            <ScheduleSkeleton />
          ) : loadError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-10 text-center">
              <h2 className="text-lg font-bold text-white">Không tải được lịch trình</h2>
              <p className="mt-2 text-sm text-red-200">{loadError}</p>
              <button
                type="button"
                onClick={() => void loadSchedule()}
                className="mt-5 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
              >
                Tải lại
              </button>
            </div>
          ) : people.length === 0 ? (
            <>
              <CalendarGrid
                people={people}
                weekDates={weekDates}
                pendingCell={pendingCell}
                onAssign={(userId, shiftDate, shift) => void saveAssignment(userId, shiftDate, shift)}
                onRemove={(userId, shiftDate, shift) => void saveAssignment(userId, shiftDate, null, shift)}
              />
              <div className="mt-4 flex justify-end">
                <Link
                  href="/settings"
                  className="inline-flex rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-blue-500/30"
                >
                  Mở nhân sự
                </Link>
              </div>
            </>
          ) : (
            <CalendarGrid
              people={people}
              weekDates={weekDates}
              pendingCell={pendingCell}
              onAssign={(userId, shiftDate, shift) => void saveAssignment(userId, shiftDate, shift)}
              onRemove={(userId, shiftDate, shift) => void saveAssignment(userId, shiftDate, null, shift)}
            />
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => toast({ type: 'success', title: 'Lịch trình đã được lưu' })}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-blue-500/30"
            >
              <Save className="h-4 w-4" />
              Lưu lịch trình
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
      <div className="grid min-w-[760px] grid-cols-8">
        {Array.from({ length: 32 }).map((_, index) => (
          <div key={index} className="min-h-14 border-r border-t border-white/10 p-3">
            <div className="h-4 animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
