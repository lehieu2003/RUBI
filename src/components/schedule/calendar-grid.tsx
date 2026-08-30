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
  headerBg: string;
  headerText: string;
}> = [
  {
    value: 'SLOT_00_03',
    label: 'Ca 1',
    time: '00:00-03:00',
    headerBg: 'bg-[#dee8ff]',
    headerText: 'text-[#00346f]',
  },
  {
    value: 'SLOT_03_06',
    label: 'Ca 2',
    time: '03:00-06:00',
    headerBg: 'bg-[#e7eeff]',
    headerText: 'text-[#00346f]',
  },
  {
    value: 'SLOT_06_09',
    label: 'Ca 3',
    time: '06:00-09:00',
    headerBg: 'bg-[#a0f399]/30',
    headerText: 'text-[#1b6d24]',
  },
  {
    value: 'SLOT_09_12',
    label: 'Ca 4',
    time: '09:00-12:00',
    headerBg: 'bg-[#a0f399]/40',
    headerText: 'text-[#1b6d24]',
  },
  {
    value: 'SLOT_12_15',
    label: 'Ca 5',
    time: '12:00-15:00',
    headerBg: 'bg-[#ffdcc2]/40',
    headerText: 'text-[#7f3700]',
  },
  {
    value: 'SLOT_15_18',
    label: 'Ca 6',
    time: '15:00-18:00',
    headerBg: 'bg-[#ffdcc2]/60',
    headerText: 'text-[#7f3700]',
  },
  {
    value: 'SLOT_18_21',
    label: 'Ca 7',
    time: '18:00-21:00',
    headerBg: 'bg-[#dee8ff]',
    headerText: 'text-[#004a99]',
  },
  {
    value: 'SLOT_21_24',
    label: 'Ca 8',
    time: '21:00-24:00',
    headerBg: 'bg-[#d8e3fb]',
    headerText: 'text-[#00346f]',
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
    <div className="overflow-x-auto rounded border border-[#c2c6d3] bg-white shadow-sm">
      <div className="grid min-w-[920px] grid-cols-8">
        <div className="sticky left-0 z-10 border-b border-r border-[#c2c6d3] bg-[#f9f9ff] p-3 text-xs font-bold uppercase tracking-wider text-[#424751]">
          Khung giờ
        </div>
        {dayLabels.map((label, index) => (
          <div
            key={label}
            className="border-b border-r border-[#c2c6d3] bg-[#f9f9ff] p-3 text-center"
          >
            <div className="text-xs font-bold text-[#111c2d]">{label}</div>
            <div className="mt-0.5 text-[11px] font-mono text-[#737783]">{formatShortDate(weekDates[index])}</div>
          </div>
        ))}

        {shiftSlots.map((slot) => (
          <div key={slot.value} className="contents">
            <div className={`sticky left-0 z-10 flex min-h-24 flex-col justify-center border-r border-t border-[#c2c6d3] p-3 ${slot.headerBg}`}>
              <span className={`text-xs font-bold ${slot.headerText}`}>{slot.label}</span>
              <span className="mt-0.5 text-[10px] font-mono text-[#424751]">{slot.time}</span>
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
                  className="min-h-24 border-r border-t border-[#e7eeff] bg-white p-1.5 hover:bg-[#f9f9ff] transition-colors"
                >
                  <div className="space-y-1.5">
                    {assignedPeople.map((person) => (
                      <div
                        key={person.id}
                        className="flex items-center justify-between gap-1.5 rounded border border-[#c2c6d3] bg-[#f0f3ff] px-2 py-1 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <span className="block truncate text-xs font-bold text-[#111c2d]">{person.name}</span>
                          <span className={`inline-flex rounded px-1 text-[10px] font-bold ${person.role === 'DRIVER' ? 'bg-[#a0f399]/40 text-[#1b6d24]' : 'bg-[#dee8ff] text-[#004a99]'}`}>
                            {getRoleLabel(person.role)}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => onRemove(person.id, shiftDate, slot.value)}
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[#737783] hover:bg-[#ffdad6] hover:text-[#ba1a1a] transition-colors disabled:opacity-50"
                          aria-label={`Bỏ ${person.name} khỏi ca ${slot.label} ${shiftDate}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}

                    <select
                      value=""
                      disabled={isPending || availablePeople.length === 0}
                      onChange={(event) => {
                        if (event.target.value) onAssign(event.target.value, shiftDate, slot.value);
                      }}
                      className="h-7 w-full rounded border border-dashed border-[#c2c6d3] bg-white px-1.5 text-[11px] font-medium text-[#424751] outline-none hover:border-[#004a99] focus:border-[#004a99] disabled:opacity-40 cursor-pointer"
                      aria-label={`Chọn nhân sự cho ca ${slot.label} ${shiftDate}`}
                    >
                      <option value="">{availablePeople.length === 0 ? 'Đã đủ ca' : '+ Gán người'}</option>
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
        <div className="border-t border-[#c2c6d3] bg-[#f9f9ff] px-4 py-3 text-xs text-[#737783]">
          Thêm nhân viên hoặc tài xế trong phần Cài đặt &gt; Nhân sự trước, sau đó phân ca trực tiếp trên bảng này.
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
