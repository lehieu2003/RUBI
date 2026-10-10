import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const globals = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
const layout = readFileSync(join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
const sidebar = readFileSync(join(process.cwd(), 'src/components/dashboard/sidebar.tsx'), 'utf8');
const settings = readFileSync(join(process.cwd(), 'src/app/settings/page.tsx'), 'utf8');
const theme = readFileSync(join(process.cwd(), 'src/lib/theme.tsx'), 'utf8');

describe('dark mode theming subsystem', () => {
  it('defines semantic tokens via @theme inline referencing runtime vars', () => {
    assert.match(globals, /@theme inline/);
    assert.match(globals, /--color-card:\s*var\(--card\)/);
    assert.match(globals, /--color-on-surface:\s*var\(--on-surface\)/);
  });

  it('has both light and dark token values', () => {
    assert.match(globals, /\.dark\s*\{/);
    assert.match(globals, /--card:\s*#171d28/); // dark card value
    assert.match(globals, /--card:\s*#ffffff/); // light card value
  });

  it('applies the stored theme before first paint (no light flash)', () => {
    assert.match(layout, /themeInitScript/);
    assert.match(layout, /classList\.toggle\('dark'/);
    assert.match(layout, /ThemeProvider/);
  });

  it('provider persists choice and follows system preference', () => {
    assert.match(theme, /STORAGE_KEY = 'iceflow-theme'/);
    assert.match(theme, /localStorage\.setItem\(STORAGE_KEY/);
    assert.match(theme, /prefers-color-scheme: dark/);
  });

  it('exposes a quick toggle in the sidebar', () => {
    assert.match(sidebar, /useTheme\(\)/);
    assert.match(sidebar, /toggleTheme/);
  });

  it('stat cards use theme tokens instead of a hard-coded white background', () => {
    const statCard = readFileSync(join(process.cwd(), 'src/components/dashboard/stat-card.tsx'), 'utf-8');
    assert.match(statCard, /bg-card/);
    assert.doesNotMatch(statCard, /bg-\[#f{3,6}\]|bg-white\b/i);
  });

  it('offers light/dark/system options in the appearance settings tab', () => {
    assert.match(settings, /useTheme\(\)/);
    assert.match(settings, /'Sáng Công Nghiệp'/);
    assert.match(settings, /'Tối'/);
    assert.match(settings, /'Theo hệ điều hành'/);
  });
});
