'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, Download, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { exportToCSV } from '@/lib/export-excel';
import { shiftSlots } from '@/components/schedule/calendar-grid';

type ReportDay = { date: string; shifts: string[] };
type ReportPerson = {
  id: string;
  name: string;
  role: 'STAFF' | 'DRIVER' | 'ADMIN';
  isActive: boolean;
  approvedShifts: number;
  hours: number;
  daysWorked: number;
  pendingShifts: number;
  rejectedShifts: number;
  days: ReportDay[];
};

const slotTime = Object.fromEntries(shiftSlots.map((slot) => [slot.value, slot.time]));
const roleLabel = (role: string) => (role === 'DRIVER' ? 'Tài xế' : role === 'ADMIN' ? 'Quản lý' : 'Nhân viên');
const formatDate = (value: string) => value.split('-').reverse().join('/');

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function ShiftReportPage() {
  const [month, setMonth] = useState(currentMonth);
  const [people, setPeople] = useState<ReportPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_ENDPOINTS.REPORTS.SHIFTS}?month=${month}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Không thể tải bảng công');
      const data = payload?.data !== undefined ? payload.data : payload;
      setPeople(Array.isArray(data?.people) ? data.people : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải bảng công');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalShifts = people.reduce((sum, person) => sum + person.approvedShifts, 0);
  const totalPending = people.reduce((sum, person) => sum + person.pendingShifts, 0);

  const exportSummary = () =>
    exportToCSV(
      `bang-cong-${month}`,
      ['Họ tên', 'Vai trò', 'Số ca đã duyệt', 'Số giờ', 'Số ngày làm', 'Ca chờ duyệt', 'Ca bị từ chối'],
      people.map((person) => [
        person.name,
        roleLabel(person.role),
        person.approvedShifts,
        person.hours,
        person.daysWorked,
        person.pendingShifts,
        person.rejectedShifts,
      ])
    );

  const exportDetail = () =>
    exportToCSV(
      `bang-cong-chi-tiet-${month}`,
      ['Họ tên', 'Vai trò', 'Ngày', 'Số ca', 'Số giờ', 'Khung giờ'],
      people.flatMap((person) =>
        person.days.map((day) => [
          person.name,
          roleLabel(person.role),
          formatDate(day.date),
          day.shifts.length,
          day.shifts.length * 3,
          day.shifts.map((shift) => slotTime[shift] ?? shift).join('; '),
        ])
      )
    );

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <div className="mb-6 flex flex-col gap-4 border-b border-outline-variant pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">Bảng Công Theo Tháng</h1>
            <p className="mt-1 text-xs text-on-surface-variant">
              Số ca làm đã được duyệt của từng người, dùng làm căn cứ tính lương. Mỗi ca dài 3 giờ.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="month"
              value={month}
              onChange={(event) => event.target.value && setMonth(event.target.value)}
              className="h-9 rounded border border-outline-variant bg-card px-3 text-sm text-on-surface"
              aria-label="Chọn tháng"
            />
            <button
              type="button"
              disabled={people.length === 0}
              onClick={exportSummary}
              className="flex h-9 items-center gap-1.5 rounded border border-outline-variant bg-card px-3 text-xs font-bold text-primary-deep hover:bg-container-high disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              XUẤT TỔNG HỢP
            </button>
            <button
              type="button"
              disabled={people.length === 0}
              onClick={exportDetail}
              className="flex h-9 items-center gap-1.5 rounded bg-[#004a99] px-3 text-xs font-bold text-white hover:bg-[#00346f] disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              XUẤT CHI TIẾT
            </button>
          </div>
        </div>

        {totalPending > 0 && (
          <div className="mb-4 rounded border border-tertiary-container/40 bg-tertiary-fixed/40 px-4 py-3 text-xs text-on-surface">
            <span className="font-bold text-tertiary-container">Còn {totalPending} ca chờ duyệt</span> trong tháng này và chưa
            được tính. Duyệt tại trang Lịch trình trước khi chốt lương.
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary-accent" />
          </div>
        ) : error ? (
          <div className="rounded border border-[#ba1a1a]/30 bg-error-container/50 p-8 text-center">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-error" />
            <p className="text-sm font-bold text-on-error-container">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 rounded bg-[#004a99] px-4 py-2 text-xs font-bold text-white hover:bg-[#00346f]"
            >
              Tải lại
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-outline-variant bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-industrial">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    <th className="py-3 px-4">Họ tên</th>
                    <th className="py-3 px-4">Vai trò</th>
                    <th className="py-3 px-4 text-right">Số ca</th>
                    <th className="py-3 px-4 text-right">Số giờ</th>
                    <th className="py-3 px-4 text-right">Ngày làm</th>
                    <th className="py-3 px-4 text-right">Chờ duyệt</th>
                    <th className="py-3 px-4 text-right">Từ chối</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {people.map((person) => (
                    <Fragment key={person.id}>
                      <tr
                        className="cursor-pointer border-b border-outline-soft hover:bg-surface"
                        onClick={() => setExpanded((current) => (current === person.id ? null : person.id))}
                      >
                        <td className="py-3 px-4 font-bold text-on-surface">
                          <span className="inline-flex items-center gap-1.5">
                            {expanded === person.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            {person.name}
                            {!person.isActive && <span className="text-[11px] font-medium text-faint">(đã khoá)</span>}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-on-surface-variant">{roleLabel(person.role)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-on-surface">{person.approvedShifts}</td>
                        <td className="py-3 px-4 text-right font-mono text-on-surface">{person.hours}</td>
                        <td className="py-3 px-4 text-right font-mono text-on-surface">{person.daysWorked}</td>
                        <td className="py-3 px-4 text-right font-mono text-tertiary-container">{person.pendingShifts || ''}</td>
                        <td className="py-3 px-4 text-right font-mono text-error">{person.rejectedShifts || ''}</td>
                      </tr>
                      {expanded === person.id && (
                        <tr className="border-b border-outline-soft bg-surface">
                          <td colSpan={7} className="px-4 py-3">
                            {person.days.length === 0 ? (
                              <p className="text-xs text-faint">Chưa có ca nào được duyệt trong tháng.</p>
                            ) : (
                              <ul className="grid gap-1 text-xs text-on-surface sm:grid-cols-2 lg:grid-cols-3">
                                {person.days.map((day) => (
                                  <li key={day.date} className="rounded border border-outline-soft bg-card px-2.5 py-1.5">
                                    <span className="font-mono font-bold">{formatDate(day.date)}</span>
                                    <span className="ml-2 text-on-surface-variant">
                                      {day.shifts.length} ca: {day.shifts.map((shift) => slotTime[shift] ?? shift).join(', ')}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {people.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-faint">
                        Chưa có ca làm nào trong tháng này.
                      </td>
                    </tr>
                  )}
                </tbody>
                {people.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-outline-variant bg-surface text-sm font-bold text-on-surface">
                      <td className="py-3 px-4" colSpan={2}>Tổng cộng</td>
                      <td className="py-3 px-4 text-right font-mono">{totalShifts}</td>
                      <td className="py-3 px-4 text-right font-mono">{totalShifts * 3}</td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
