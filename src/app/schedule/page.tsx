'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Users, Loader2, AlertCircle, CheckCheck } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
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

function formatWeekLabel(weekStart: Date): string {
  const format = (date: Date) =>
    `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  const weekEnd = addDays(weekStart, 6);
  return `Tuần từ ${format(weekStart)} đến ${format(weekEnd)}/${weekEnd.getUTCFullYear()}`;
}

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [people, setPeople] = useState<SchedulePerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingCell, setPendingCell] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);

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
      const data = payload?.data !== undefined ? payload.data : payload;
      setPeople(Array.isArray(data) ? data : Array.isArray(data?.people) ? data.people : []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Không thể tải lịch trình');
    } finally {
      setLoading(false);
    }
  }, [weekStartParam]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const saveAssignment = async (userId: string, shiftDate: string, shift: Shift | null, previousShift?: Shift) => {
    const currentShift = shift ?? previousShift;
    if (!currentShift) return;

    const cellKey = `${currentShift}:${shiftDate}`;
    setPendingCell(shift ? cellKey : `REMOVE:${shiftDate}`);

    try {
      const response = await fetch(API_ENDPOINTS.SCHEDULE.ASSIGNMENTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          shiftDate,
          shift,
          removeShift: shift === null ? currentShift : undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Cập nhật thất bại');
      }

      setPeople((current) =>
        current.map((person) => {
          if (person.id !== userId) return person;
          const filtered = person.shifts.filter(
            (item) => !(item.shiftDate === shiftDate && item.shift === currentShift)
          );
          const saved = (payload?.data !== undefined ? payload.data : payload)?.assignment;
          return {
            ...person,
            shifts: shift
              ? [...filtered, { id: saved?.id, shiftDate, shift, status: 'APPROVED' as const }]
              : filtered,
          };
        })
      );
      toast({ type: 'success', title: shift ? 'Đã gán ca làm việc' : 'Đã xóa ca làm việc' });
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

  const pendingIds = people.flatMap((person) =>
    person.shifts.filter((item) => item.status === 'PENDING' && item.id).map((item) => item.id as string)
  );

  const reviewShifts = async (ids: string[], action: 'APPROVE' | 'REJECT') => {
    if (ids.length === 0) return;
    setReviewing(true);
    try {
      const response = await fetch(API_ENDPOINTS.SCHEDULE.REVIEW, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Không thể duyệt ca');
      }
      const status = action === 'APPROVE' ? ('APPROVED' as const) : ('REJECTED' as const);
      setPeople((current) =>
        current.map((person) => ({
          ...person,
          shifts: person.shifts.map((item) => (item.id && ids.includes(item.id) ? { ...item, status } : item)),
        }))
      );
      toast({
        type: 'success',
        title: action === 'APPROVE' ? `Đã duyệt ${ids.length} ca` : `Đã từ chối ${ids.length} ca`,
      });
    } catch (error) {
      toast({
        type: 'error',
        title: 'Lỗi',
        message: error instanceof Error ? error.message : 'Không thể duyệt ca',
      });
    } finally {
      setReviewing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">Lịch Trình & Phân Ca</h1>
            <p className="text-xs text-on-surface-variant mt-1">{formatWeekLabel(weekStart)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekStart((current) => addDays(current, -7))}
              className="flex h-9 w-9 items-center justify-center rounded border border-outline-variant bg-card text-on-surface-variant hover:bg-container-high transition-colors shadow-2xs"
              aria-label="Tuần trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(getMonday(new Date()))}
              className={`h-9 rounded border px-3.5 text-xs font-bold transition-colors shadow-2xs ${
                weekStartParam === toDateOnly(getMonday(new Date()))
                  ? 'border-[#004a99] bg-[#004a99] text-white'
                  : 'border-outline-variant bg-card text-primary-deep hover:bg-container-high'
              }`}
            >
              Tuần này
            </button>
            <button
              type="button"
              onClick={() => setWeekStart((current) => addDays(current, 7))}
              className="flex h-9 w-9 items-center justify-center rounded border border-outline-variant bg-card text-on-surface-variant hover:bg-container-high transition-colors shadow-2xs"
              aria-label="Tuần sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <Link
              href="/settings"
              className="ml-2 flex items-center gap-1.5 rounded border border-outline-variant bg-card px-3 py-2 text-xs font-bold text-primary-deep hover:bg-container-high transition-colors shadow-2xs"
            >
              <Users className="h-4 w-4" />
              QUẢN LÝ NHÂN SỰ
            </Link>
            <Link
              href="/reports/shifts"
              className="flex items-center gap-1.5 rounded border border-outline-variant bg-card px-3 py-2 text-xs font-bold text-primary-deep hover:bg-container-high transition-colors shadow-2xs"
            >
              BẢNG CÔNG
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary-accent" />
          </div>
        ) : loadError ? (
          <div className="rounded border border-[#ba1a1a]/30 bg-error-container/50 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-error mx-auto mb-2" />
            <h2 className="text-base font-bold text-on-error-container">Không tải được lịch trình</h2>
            <p className="mt-1 text-xs text-on-surface-variant">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadSchedule()}
              className="mt-4 rounded bg-[#004a99] px-4 py-2 text-xs font-bold text-white hover:bg-[#00346f] transition-colors"
            >
              Tải lại
            </button>
          </div>
        ) : (
          <>
            {pendingIds.length > 0 && (
              <div className="mb-4 flex flex-col gap-3 rounded border border-tertiary-container/40 bg-tertiary-fixed/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-on-surface">
                  <span className="font-bold text-tertiary-container">{pendingIds.length} ca chờ duyệt</span> do nhân viên, tài xế
                  tự đăng ký trong tuần này. Bấm ✓ để duyệt, × để từ chối từng ca.
                </p>
                <button
                  type="button"
                  disabled={reviewing}
                  onClick={() => void reviewShifts(pendingIds, 'APPROVE')}
                  className="flex shrink-0 items-center justify-center gap-1.5 rounded bg-[#004a99] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#00346f] transition-colors disabled:opacity-50"
                >
                  <CheckCheck className="h-4 w-4" />
                  DUYỆT TẤT CẢ
                </button>
              </div>
            )}
            <CalendarGrid
              people={people}
              weekDates={weekDates}
              pendingCell={reviewing ? 'REVIEWING' : pendingCell}
              onAssign={(userId, shiftDate, shift) => void saveAssignment(userId, shiftDate, shift)}
              onRemove={(userId, shiftDate, shift) => void saveAssignment(userId, shiftDate, null, shift)}
              onReview={(assignmentId, action) => void reviewShifts([assignmentId], action)}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
