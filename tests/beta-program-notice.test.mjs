import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pagesSource = await readFile(new URL('../src/platform/PlatformPages.jsx', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');

test('publishes a bilingual beta notice from forms, portal and footer', () => {
  assert.match(pagesSource, /function BetaStatusNotice/);
  assert.match(pagesSource, /function BetaProgramPage/);
  assert.match(pagesSource, /clean === '\/programa-beta'/);
  assert.match(pagesSource, /La red CarDaddy está en una prueba beta gratuita/);
  assert.match(mainSource, /Beta Program Notice/);
});

test('distinguishes direct CarDaddy work from independent network referrals', () => {
  assert.match(pagesSource, /operates its own mobile mechanic business and is also testing a separate provider-connection network/);
  assert.match(pagesSource, /confirm whether CarDaddy or an independent provider is performing the service/);
  assert.match(pagesSource, /actual relationship and level of control/);
});

test('free beta does not create undisclosed or retroactive future charges', () => {
  assert.match(pagesSource, /currently charges no membership fee and no commission/);
  assert.match(pagesSource, /no future fee or commission will be charged retroactively/);
  assert.match(pagesSource, /advance disclosure and separate acceptance/);
});
