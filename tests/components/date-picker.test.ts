import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const picker = readFileSync('src/components/ui/date-picker.tsx', 'utf8');

describe('Vietnamese date and month pickers', () => {
  it('no page uses the native date/month inputs (they follow the browser language)', () => {
    const hits = execSync(
      "grep -rnE \"type=['\\\"](date|month|week|datetime-local)['\\\"]\" src || true",
      { encoding: 'utf8' }
    ).trim();
    assert.equal(hits, '', 'use DatePicker / MonthPicker from components/ui/date-picker: ' + hits);
  });

  it('labels the calendar in Vietnamese, Monday first', () => {
    assert.match(picker, /\['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'\]/);
    assert.match(picker, /Tháng \{viewMonth\}, \{viewYear\}/);
    assert.match(picker, /Hôm nay/);
    assert.match(picker, /Năm \{viewYear\}/);
    assert.match(picker, /getDay\(\) \+ 6\) % 7/);
  });

  it('shows dates as dd/mm/yyyy and months as "Tháng m/yyyy"', () => {
    assert.match(picker, /`\$\{day\}\/\$\{month\}\/\$\{year\}`/);
    assert.match(picker, /`Tháng \$\{Number\(month\)\}\/\$\{year\}`/);
  });
});

describe('schedule pages use full Vietnamese day names', () => {
  it('calendar grid labels', () => {
    const grid = readFileSync('src/components/schedule/calendar-grid.tsx', 'utf8');
    assert.match(grid, /'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'/);
  });
});
