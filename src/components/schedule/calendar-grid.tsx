'use client';

export type Shift =
  | 'SLOT_00_03'
  | 'SLOT_03_06'
  | 'SLOT_06_09'
  | 'SLOT_09_12'
  | 'SLOT_12_15'
  | 'SLOT_15_18'
  | 'SLOT_18_21'
  | 'SLOT_21_24';
export type ScheduleRole = 'STAFF' | 'DRIVER';
export type ShiftStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ScheduleShift = {
  id?: string;
  shiftDate: string;
  shift: Shift;
  status?: ShiftStatus;
};

export type SchedulePerson = {
  id: string;
  name: string;
  role: ScheduleRole;
  shifts: ScheduleShift[];
};

export const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

export const shiftSlots: Array<{
  value: Shift;
  label: string;
  time: string;
  headerBg: string;
  headerText: string;
}> = [
  {
    value: 'SLOT_00_03',
    label: 'Ca 1',
    time: '00:00-03:00',
    headerBg: 'bg-container-high',
    headerText: 'text-primary-deep',
  },
  {
    value: 'SLOT_03_06',
    label: 'Ca 2',
    time: '03:00-06:00',
    headerBg: 'bg-container',
    headerText: 'text-primary-deep',
  },
  {
    value: 'SLOT_06_09',
    label: 'Ca 3',
    time: '06:00-09:00',
    headerBg: 'bg-[#a0f399]/30',
    headerText: 'text-secondary',
  },
  {
    value: 'SLOT_09_12',
    label: 'Ca 4',
    time: '09:00-12:00',
    headerBg: 'bg-[#a0f399]/40',
    headerText: 'text-secondary',
  },
  {
    value: 'SLOT_12_15',
    label: 'Ca 5',
    time: '12:00-15:00',
    headerBg: 'bg-tertiary-fixed/40',
    headerText: 'text-tertiary-container',
  },
  {
    value: 'SLOT_15_18',
    label: 'Ca 6',
    time: '15:00-18:00',
    headerBg: 'bg-tertiary-fixed/60',
    headerText: 'text-tertiary-container',
  },
  {
    value: 'SLOT_18_21',
    label: 'Ca 7',
    time: '18:00-21:00',
    headerBg: 'bg-container-high',
    headerText: 'text-primary-accent',
  },
  {
    value: 'SLOT_21_24',
    label: 'Ca 8',
    time: '21:00-24:00',
    headerBg: 'bg-container-highest',
    headerText: 'text-primary-deep',
  },
];

type CalendarGridProps = {
  people: SchedulePerson[];
  weekDates: string[];
  pendingCell: string | null;
  onAssign: (userId: string, shiftDate: string, shift: Shift) => void;
  onRemove: (userId: string, shiftDate: string, shift: Shift) => void;
  onReview?: (assignmentId: string, action: 'APPROVE' | 'REJECT') => void;
};

export function CalendarGrid({ people, weekDates, pendingCell, onAssign, onRemove, onReview }: CalendarGridProps) {
  return (
    <div className="overflow-x-auto rounded border border-outline-variant bg-card shadow-sm">
      <div className="grid min-w-[920px] grid-cols-8">
        <div className="sticky left-0 z-10 border-b border-r border-outline-variant bg-surface p-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Khung giờ
        </div>
        {dayLabels.map((label, index) => {
          const dateStr = weekDates[index];
          const isToday = dateStr === new Date().toISOString().slice(0, 10);
          return (
            <div
              key={label}
              className={`border-b border-r border-outline-variant p-2.5 text-center transition-colors ${
                isToday ? 'bg-container-high/80 font-bold border-b-2 border-b-[#004a99]' : 'bg-surface'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <span className={`text-xs font-bold ${isToday ? 'text-primary-accent' : 'text-on-surface'}`}>{label}</span>
                {isToday && (
                  <span className="rounded bg-[#004a99] px-1 py-0.2 text-[9px] font-bold text-white uppercase tracking-wider">
                    Hôm nay
                  </span>
                )}
              </div>
              <div className={`mt-0.5 text-[11px] font-mono ${isToday ? 'text-primary-deep font-bold' : 'text-faint'}`}>
                {formatShortDate(dateStr)}
              </div>
            </div>
          );
        })}

        {shiftSlots.map((slot) => (
          <div key={slot.value} className="contents">
            <div className={`sticky left-0 z-10 flex min-h-24 flex-col justify-center border-r border-t border-outline-variant p-3 ${slot.headerBg}`}>
              <span className={`text-xs font-bold ${slot.headerText}`}>{slot.label}</span>
              <span className="mt-0.5 text-[10px] font-mono text-on-surface-variant">{slot.time}</span>
            </div>
            {weekDates.map((shiftDate) => {
              // Rejected requests leave the person free to be assigned by the manager.
              const cellShift = (person: SchedulePerson) =>
                person.shifts.find(
                  (assignment) =>
                    assignment.shiftDate === shiftDate &&
                    assignment.shift === slot.value &&
                    assignment.status !== 'REJECTED'
                );
              const assignedPeople = people.filter((person) => cellShift(person));
              const availablePeople = people.filter((person) => !cellShift(person));
              const cellKey = `${slot.value}:${shiftDate}`;
              const isPending = pendingCell === 'REVIEWING' || pendingCell === cellKey || pendingCell === `REMOVE:${shiftDate}`;

              return (
                <div
                  key={shiftDate}
                  className="min-h-24 border-r border-t border-outline-soft bg-card p-1.5 hover:bg-surface transition-colors"
                >
                  <div className="space-y-1.5">
                    {assignedPeople.map((person) => {
                      const assignment = cellShift(person);
                      const awaitingReview = assignment?.status === 'PENDING';
                      return (
                      <div
                        key={person.id}
                        className={`flex items-center justify-between gap-1.5 rounded border px-2 py-1 shadow-2xs ${
                          awaitingReview
                            ? 'border-dashed border-tertiary-container bg-tertiary-fixed/40'
                            : 'border-outline-variant bg-container-low'
                        }`}
                      >
                        <div className="min-w-0" title={person.name}>
                          <span className="block truncate text-xs font-bold text-on-surface">{person.name}</span>
                          <span className={`inline-flex rounded px-1 text-[10px] font-bold ${person.role === 'DRIVER' ? 'bg-[#a0f399]/40 text-secondary' : 'bg-container-high text-primary-accent'}`}>
                            {getRoleLabel(person.role)}
                          </span>
                          {awaitingReview && (
                            <span className="ml-1 text-[10px] font-bold text-tertiary-container">Chờ duyệt</span>
                          )}
                        </div>
                        {awaitingReview && assignment?.id && onReview && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => onReview(assignment.id!, 'APPROVE')}
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#a0f399]/50 text-secondary text-xs font-bold hover:bg-[#a0f399] transition-colors disabled:opacity-50"
                            aria-label={`Duyệt ca ${slot.label} ${shiftDate} của ${person.name}`}
                          >
                            ✓
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            awaitingReview && assignment?.id && onReview
                              ? onReview(assignment.id, 'REJECT')
                              : onRemove(person.id, shiftDate, slot.value)
                          }
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-faint hover:bg-error-container hover:text-error transition-colors disabled:opacity-50"
                          aria-label={
                            awaitingReview
                              ? `Từ chối ca ${slot.label} ${shiftDate} của ${person.name}`
                              : `Bỏ ${person.name} khỏi ca ${slot.label} ${shiftDate}`
                          }
                        >
                          ×
                        </button>
                      </div>
                      );
                    })}

                    <select
                      value=""
                      disabled={isPending || availablePeople.length === 0}
                      onChange={(event) => {
                        if (event.target.value) onAssign(event.target.value, shiftDate, slot.value);
                      }}
                      className="h-7 w-full rounded border border-dashed border-outline-variant bg-card px-1.5 text-[11px] font-medium text-on-surface-variant outline-none hover:border-[#004a99] focus:border-[#004a99] disabled:opacity-40 cursor-pointer"
                      aria-label={`Chọn nhân sự cho ca ${slot.label} ${shiftDate}`}
                    >
                      <option value="">
                        {people.length === 0
                          ? 'Chưa có nhân sự'
                          : availablePeople.length === 0
                            ? 'Đã gán hết'
                            : '+ Thêm vào ca'}
                      </option>
                      {availablePeople.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name} ({getRoleLabel(person.role)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {people.length === 0 && (
        <div className="border-t border-outline-variant bg-container-high/30 px-4 py-3 text-xs text-primary-deep flex items-center justify-between">
          <span>Chưa có nhân viên hoặc tài xế nào trong hệ thống nhà máy của bạn.</span>
          <a
            href="/settings?tab=staff"
            className="font-bold text-primary-accent hover:underline"
          >
            Thêm nhân sự ngay &rarr;
          </a>
        </div>
      )}
    </div>
  );
}

function getRoleLabel(role: ScheduleRole): string {
  return role === 'DRIVER' ? 'Tài xế' : 'Nhân viên';
}

function formatShortDate(value: string): string {
  const [, month, day] = value.split('-');
  return `${day}/${month}`;
}
