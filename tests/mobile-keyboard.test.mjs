import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const keyboardSource = await readFile(new URL('../src/lib/mobile-keyboard.js', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
const stylesSource = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
const htmlSource = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('installs one global mobile keyboard guard for every application route', () => {
  assert.match(mainSource, /useEffect\(\(\) => installMobileKeyboardGuard\(\), \[\]\)/);
  assert.match(keyboardSource, /document\.addEventListener\('focusin'/);
  assert.match(keyboardSource, /window\.visualViewport/);
});

test('keeps the focused control inside the visual viewport during keyboard animation', () => {
  assert.match(keyboardSource, /viewport\?\.addEventListener\('resize'/);
  assert.match(keyboardSource, /viewport\?\.addEventListener\('scroll'/);
  assert.match(keyboardSource, /scrollIntoView\(\{ block: 'center'/);
  assert.match(keyboardSource, /scheduleVisibilityCheck\(520\)/);
});

test('adds keyboard-safe scroll space to public and admin forms', () => {
  assert.match(stylesSource, /--keyboard-inset: 0px/);
  assert.match(stylesSource, /html\.keyboard-open body/);
  assert.match(stylesSource, /html\.keyboard-open \.admin-main/);
  assert.match(htmlSource, /interactive-widget=resizes-content/);
});
