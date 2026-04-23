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

export type SchedulePerson = {
  id: string;
  name: string;
  role: ScheduleRole;
  shifts: Array<{
    shiftDate: string;
    shift: Shift;
  }>;
};

export const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const shiftSlots: Array<{
  value: Shift;
  label: string;
  time: string;
  className: string;
}> = [
  {
    value: 'SLOT_00_03',
    label: 'Ca 1',
    time: '00:00-03:00',
    className: 'border-sky-500/30 bg-sky-500/15 text-sky-300',
  },
  {
    value: 'SLOT_03_06',
    label: 'Ca 2',
    time: '03:00-06:00',
    className: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300',
  },
  {
    value: 'SLOT_06_09',
    label: 'Ca 3',
    time: '06:00-09:00',
    className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  },
  {
    value: 'SLOT_09_12',
    label: 'Ca 4',
    time: '09:00-12:00',
    className: 'border-lime-500/30 bg-lime-500/15 text-lime-300',
  },
  {
    value: 'SLOT_12_15',
    label: 'Ca 5',
    time: '12:00-15:00',
    className: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
  },
  {
    value: 'SLOT_15_18',
    label: 'Ca 6',
    time: '15:00-18:00',
    className: 'border-orange-500/30 bg-orange-500/15 text-orange-300',
  },
  {
    value: 'SLOT_18_21',
    label: 'Ca 7',
    time: '18:00-21:00',
    className: 'border-blue-500/30 bg-blue-500/15 text-blue-300',
  },
  {
    value: 'SLOT_21_24',
    label: 'Ca 8',
    time: '21:00-24:00',
    className: 'border-violet-500/30 bg-violet-500/15 text-violet-300',
  },
];

type CalendarGridProps = {
  people: SchedulePerson[];
  weekDates: string[];
  pendingCell: string | null;
  onAssign: (userId: string, shiftDate: string, shift: Shift) => void;
  onRemove: (userId: string, shiftDate: string, shift: Shift) => void;
};

export function CalendarGrid({ people, weekDates, pendingCell, onAssign, onRemove }: CalendarGridProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
      <div className="grid min-w-[920px] grid-cols-8">
        <div className="sticky left-0 z-10 border-b border-r border-white/10 bg-slate-900/95 p-3 text-xs font-semibold text-slate-400">
          Khung giờ
        </div>
        {dayLabels.map((label, index) => (
          <div
            key={label}
            className="border-b border-r border-white/10 bg-slate-900/80 p-3 text-center"
          >
            <div className="text-xs font-semibold text-slate-300">{label}</div>
            <div className="mt-1 text-[11px] text-slate-500">{formatShortDate(weekDates[index])}</div>
          </div>
        ))}

        {shiftSlots.map((slot) => (
          <div key={slot.value} className="contents">
            <div className={`sticky left-0 z-10 flex min-h-28 flex-col justify-center border-r border-t p-3 ${slot.className}`}>
              <span className="text-sm font-bold">{slot.label}</span>
              <span className="mt-1 text-[11px] opacity-80">{slot.time}</span>
            </div>
            {weekDates.map((shiftDate) => {
              const assignedPeople = people.filter((person) =>
                person.shifts.some((assignment) => assignment.shiftDate === shiftDate && assignment.shift === slot.value)
              );
              const availablePeople = people.filter((person) =>
                !person.shifts.some((assignment) => assignment.shiftDate === shiftDate && assignment.shift === slot.value)
              );
              const cellKey = `${slot.value}:${shiftDate}`;
              const isPending = pendingCell === cellKey || pendingCell === `REMOVE:${shiftDate}`;

              return (
                <div
                  key={shiftDate}
                  className="min-h-28 border-r border-t border-white/10 bg-white/[0.03] p-2"
                >
                  <div className="space-y-2">
                    {assignedPeople.map((person) => (
                      <div
                        key={person.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-900/70 px-2 py-1.5"
                      >
                        <div className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-white">{person.name}</span>
                          <span className={`mt-0.5 inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${person.role === 'DRIVER' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-blue-500/15 text-blue-300'}`}>
                            {getRoleLabel(person.role)}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => onRemove(person.id, shiftDate, slot.value)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-300 disabled:cursor-wait disabled:opacity-60"
                          aria-label={`Bỏ ${person.name} khỏi ca ${slot.label} ${shiftDate}`}
                        >
                          x
                        </button>
                      </div>
                    ))}

                    {people.length === 0 ? (
                      <div className="flex min-h-10 items-center justify-center rounded-lg border border-dashed border-white/10 text-xs font-semibold text-slate-600">
                        +
                      </div>
                    ) : (
                      <select
                        value=""
                        disabled={isPending || availablePeople.length === 0}
                        onChange={(event) => {
                          if (event.target.value) onAssign(event.target.value, shiftDate, slot.value);
                        }}
                        className="h-9 w-full rounded-lg border border-dashed border-white/10 bg-slate-950/70 px-2 text-xs font-semibold text-slate-300 outline-none transition-colors hover:border-blue-500/40 focus:border-blue-500/60 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Chọn nhân sự cho ca ${slot.label} ${shiftDate}`}
                      >
                        <option value="">{availablePeople.length === 0 ? 'Đã đủ ca' : '+ Chọn người'}</option>
                        {availablePeople.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name} - {getRoleLabel(person.role)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {people.length === 0 && (
        <div className="border-t border-white/10 px-4 py-3 text-sm text-slate-400">
          Thêm nhân viên hoặc tài xế trong Nhân sự trước, sau đó chọn người trong từng khung giờ.
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
