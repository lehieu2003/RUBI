'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarCheck, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from '@/components/dashboard/toast';
import { useAuth } from '@/lib/auth-provider';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { dayLabels, shiftSlots, type Shift, type ShiftStatus } from '@/components/schedule/calendar-grid';

type TeamShift = { shiftDate: string; shift: Shift; status: ShiftStatus };
type TeamMember = { id: string; name: string; role: 'STAFF' | 'DRIVER'; shifts: TeamShift[] };

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMonday(date: Date): Date {
  const monday = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = monday.getUTCDay();
  monday.setUTCDate(monday.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return monday;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDay(value: string): string {
  const [, month, day] = value.split('-');
  return `${day}/${month}`;
}

const statusStyle: Record<ShiftStatus, string> = {
  APPROVED: 'border-secondary bg-[#a0f399]/40 text-secondary',
  PENDING: 'border-dashed border-tertiary-container bg-tertiary-fixed/50 text-tertiary-container',
  REJECTED: 'border-error/50 bg-error-container/60 text-error',
};
const statusLabel: Record<ShiftStatus, string> = {
  APPROVED: 'Đã duyệt',
  PENDING: 'Chờ duyệt',
  REJECTED: 'Bị từ chối',
};

export default function MySchedulePage() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [today, setToday] = useState(() => toDateOnly(new Date()));
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const [limits, setLimits] = useState<{ STAFF: number | null; DRIVER: number | null }>({ STAFF: null, DRIVER: null });
  const [lockedMonths, setLockedMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const weekParam = toDateOnly(weekStart);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => toDateOnly(addDays(weekStart, index))),
    [weekStart]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_ENDPOINTS.SCHEDULE.MY}?week=${weekParam}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Không thể tải lịch');
      const data = payload?.data !== undefined ? payload.data : payload;
      setTeam(Array.isArray(data?.people) ? data.people : []);
      setMyId(data?.userId ?? null);
      if (data?.today) setToday(data.today);
      if (typeof data?.currentHour === 'number') setCurrentHour(data.currentHour);
      if (data?.limits) setLimits(data.limits);
      setLockedMonths(Array.isArray(data?.lockedMonths) ? data.lockedMonths : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải lịch');
    } finally {
      setLoading(false);
    }
  }, [weekParam]);

  useEffect(() => {
    void load();
  }, [load]);

  const me = team.find((member) => member.id === myId);
  const myShifts = me?.shifts ?? [];
  const myLimit = me ? limits[me.role] : null;
  const myCount = (status: ShiftStatus) => myShifts.filter((item) => item.status === status).length;

  const toggleShift = async (shiftDate: string, shift: Shift, current?: ShiftStatus) => {
    if (current === 'APPROVED') {
      toast({ type: 'info', title: 'Ca đã được duyệt', message: 'Liên hệ Quản lý nếu cần thay đổi.' });
      return;
    }
    const key = `${shiftDate}:${shift}`;
    setSavingKey(key);
    try {
      const response = await fetch(API_ENDPOINTS.SCHEDULE.MY, {
        // No request yet: ask for the shift. Pending or rejected: withdraw it.
        method: current ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftDate, shift }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Không thể cập nhật ca');

      setTeam((members) =>
        members.map((member) => {
          if (member.id !== myId) return member;
          const others = member.shifts.filter((item) => !(item.shiftDate === shiftDate && item.shift === shift));
          return {
            ...member,
            shifts: current ? others : [...others, { shiftDate, shift, status: 'PENDING' as const }],
          };
        })
      );
      toast({ type: 'success', title: current ? 'Đã huỷ đăng ký ca' : 'Đã gửi đăng ký, chờ Quản lý duyệt' });
    } catch (err) {
      toast({
        type: 'error',
        title: 'Không thể cập nhật ca',
        message: err instanceof Error ? err.message : 'Đã xảy ra lỗi',
      });
    } finally {
      setSavingKey(null);
    }
  };

  const homeHref = user?.role === 'DRIVER' ? '/driver' : '/dashboard';

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="sticky top-0 z-20 border-b border-[#002754] bg-[#00346f] px-4 py-3 text-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href={homeHref} className="rounded p-1.5 text-[#9bbdff] hover:bg-[#004a99] hover:text-white" aria-label="Quay lại">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold leading-tight">Đăng ký ca làm</h1>
            <p className="truncate text-[11px] text-[#9bbdff]">{user?.name ?? ''}</p>
          </div>
          <CalendarCheck className="h-5 w-5 text-[#9bbdff]" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-4 pb-16">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setWeekStart((current) => addDays(current, -7))}
            className="flex h-10 w-10 items-center justify-center rounded border border-outline-variant bg-card text-on-surface-variant hover:bg-container-high"
            aria-label="Tuần trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(getMonday(new Date()))}
            className="h-10 flex-1 rounded border border-outline-variant bg-card px-3 text-xs font-bold text-primary-deep hover:bg-container-high"
          >
            Tuần từ {formatDay(weekDates[0])} đến {formatDay(weekDates[6])}
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((current) => addDays(current, 7))}
            className="flex h-10 w-10 items-center justify-center rounded border border-outline-variant bg-card text-on-surface-variant hover:bg-container-high"
            aria-label="Tuần sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 rounded border border-outline-variant bg-card p-3 text-xs text-on-surface-variant">
          <p>
            Chạm vào một khung giờ để đăng ký. Ca chỉ được tính khi Quản lý duyệt; ca đã duyệt muốn đổi thì báo Quản lý.
          </p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-bold">
            <span className="text-secondary">Đã duyệt: {myCount('APPROVED')}</span>
            <span className="text-tertiary-container">Chờ duyệt: {myCount('PENDING')}</span>
            <span className="text-error">Bị từ chối: {myCount('REJECTED')}</span>
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary-accent" />
          </div>
        ) : error ? (
          <div className="rounded border border-[#ba1a1a]/30 bg-error-container/50 p-6 text-center">
            <p className="text-sm font-bold text-on-error-container">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-3 rounded bg-[#004a99] px-4 py-2 text-xs font-bold text-white hover:bg-[#00346f]"
            >
              Tải lại
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {weekDates.map((shiftDate, dayIndex) => {
              const isPast = shiftDate < today;
              const isLocked = lockedMonths.includes(shiftDate.slice(0, 7));
              return (
                <section
                  key={shiftDate}
                  className={`rounded border bg-card p-3 ${shiftDate === today ? 'border-[#004a99]' : 'border-outline-variant'}`}
                >
                  <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-on-surface">
                    {dayLabels[dayIndex]}, {formatDay(shiftDate)}
                    {shiftDate === today && (
                      <span className="rounded bg-[#004a99] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Hôm nay</span>
                    )}
                    {isPast && <span className="text-[11px] font-medium text-faint">Đã qua</span>}
                    {isLocked && <span className="text-[11px] font-bold text-secondary">Đã chốt bảng công</span>}
                  </h2>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {shiftSlots.map((slot) => {
                      const mine = myShifts.find((item) => item.shiftDate === shiftDate && item.shift === slot.value);
                      const others = team.filter(
                        (member) =>
                          member.id !== myId &&
                          member.shifts.some((item) => item.shiftDate === shiftDate && item.shift === slot.value)
                      );
                      const key = `${shiftDate}:${slot.value}`;
                      // Slots of today that have already ended cannot be registered any more.
                      const ended = shiftDate === today && Number(slot.value.slice(-2)) <= currentHour;
                      const sameRole = others.filter((member) => member.role === me?.role).length;
                      const full = !mine && myLimit != null && sameRole >= myLimit;
                      return (
                        <button
                          key={slot.value}
                          type="button"
                          disabled={isPast || isLocked || ended || full || savingKey !== null}
                          onClick={() => void toggleShift(shiftDate, slot.value, mine?.status)}
                          className={`min-h-[64px] rounded border px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            mine ? statusStyle[mine.status] : 'border-outline-variant bg-surface text-on-surface hover:border-primary-accent'
                          }`}
                          aria-label={`${slot.label} ${slot.time} ngày ${formatDay(shiftDate)}${mine ? `, ${statusLabel[mine.status]}` : ''}`}
                        >
                          <span className="flex items-center justify-between gap-1 text-xs font-bold">
                            <span className="font-mono">{slot.time}</span>
                            {savingKey === key && <Loader2 className="h-3 w-3 animate-spin" />}
                          </span>
                          <span className="mt-0.5 block text-[11px] font-bold">
                            {mine ? statusLabel[mine.status] : ended ? 'Đã qua giờ' : full ? 'Đã đủ người' : slot.label}
                          </span>
                          <span
                            className="block truncate text-[10px] font-medium opacity-80"
                            title={others.map((member) => member.name).join(', ')}
                          >
                            {others.length === 0 ? 'Chưa ai đăng ký' : others.map((member) => member.name).join(', ')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
