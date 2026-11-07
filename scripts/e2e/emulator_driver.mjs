#!/usr/bin/env node
/**
 * Emulator UI driver for Decidix end-to-end verification.
 *
 * Flutter only publishes its semantics tree to Android accessibility services, so
 * every command here relies on `settings put secure accessibility_enabled 1`
 * (see `enable`). Interaction goes through uiautomator node bounds, which means
 * the assertions read the same tree a screen reader would.
 *
 * Requires only `adb`; no npm dependencies.
 *
 * Usage:
 *   node scripts/e2e/emulator_driver.mjs enable
 *   node scripts/e2e/emulator_driver.mjs dump [substring]
 *   node scripts/e2e/emulator_driver.mjs text
 *   node scripts/e2e/emulator_driver.mjs tap "<content-desc substring>" [--index N]
 *   node scripts/e2e/emulator_driver.mjs type "<text>"
 *   node scripts/e2e/emulator_driver.mjs wait "<substring>" [--timeout 15000] [--gone]
 *   node scripts/e2e/emulator_driver.mjs shot <relative-name>
 *   node scripts/e2e/emulator_driver.mjs launch|stop
 *   node scripts/e2e/emulator_driver.mjs logs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ADB = process.env.ADB || 'E:/Android/Sdk/platform-tools/adb.exe';
const SERIAL = process.env.EMULATOR_SERIAL || 'emulator-5554';
const PACKAGE = 'com.decidixteam.app';
const ACTIVITY = `${PACKAGE}/.MainActivity`;
const DUMP_PATH = '/sdcard/decidix_e2e.xml';

export function adb(...args) {
  return execFileSync(ADB, ['-s', SERIAL, ...args], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}

function decodeEntities(value) {
  return value
    .replace(/&#10;/g, '\n')
    .replace(/&#9;/g, '\t')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Reads the current accessibility tree as `{ desc, bounds: [x1,y1,x2,y2], clickable }[]`. */
export function nodes() {
  adb('shell', 'uiautomator', 'dump', DUMP_PATH);
  const xml = adb('exec-out', 'cat', DUMP_PATH);
  const result = [];
  for (const match of xml.matchAll(/<node\b[^>]*>/g)) {
    const tag = match[0];
    const desc = /content-desc="([^"]*)"/.exec(tag)?.[1] ?? '';
    const boundsText = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(tag);
    if (!boundsText) continue;
    const raw = decodeEntities(desc).trim();
    if (!raw) continue;
    result.push({
      desc: raw,
      bounds: boundsText.slice(1, 5).map(Number),
      clickable: /clickable="true"/.test(tag),
    });
  }
  return result;
}

export function waitFor(match, { timeout = 20000, interval = 700, gone = false } = {}) {
  const deadline = Date.now() + timeout;
  let last = [];
  while (Date.now() < deadline) {
    try {
      last = nodes();
    } catch {
      last = [];
    }
    const found = last.find((node) => node.desc.includes(match));
    if (gone ? !found : found) return found ?? null;
    sleepSync(interval);
  }
  const seen = last.map((node) => node.desc.split('\n')[0]).slice(0, 25);
  throw new Error(
    `Timed out after ${timeout}ms waiting for ${gone ? 'removal of' : ''} "${match}".\nVisible: ${seen.join(' | ')}`,
  );
}

export function tap(match, { index = 0 } = {}) {
  const matches = nodes().filter((node) => node.desc.includes(match));
  if (!matches[index]) {
    throw new Error(`No node matching "${match}" (found ${matches.length}).`);
  }
  const [x1, y1, x2, y2] = matches[index].bounds;
  adb('shell', 'input', 'tap', String(Math.round((x1 + x2) / 2)), String(Math.round((y1 + y2) / 2)));
  return matches[index];
}

export function typeText(text) {
  // `input text` treats spaces as %s; it also only accepts ASCII.
  adb('shell', 'input', 'text', text.replace(/ /g, '%s'));
}

export function screenshot(name) {
  const target = resolve('docs/evidence/e2e', `${name}.png`);
  mkdirSync(dirname(target), { recursive: true });
  const png = execFileSync(ADB, ['-s', SERIAL, 'exec-out', 'screencap', '-p'], {
    maxBuffer: 64 * 1024 * 1024,
  });
  writeFileSync(target, png);
  return target;
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

const [command, ...rest] = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = rest.indexOf(`--${name}`);
  return index >= 0 ? rest[index + 1] : fallback;
};
const positional = rest.filter((arg, i) => !arg.startsWith('--') && !rest[i - 1]?.startsWith('--'));

try {
  switch (command) {
    case 'enable':
      adb('shell', 'settings', 'put', 'secure', 'accessibility_enabled', '1');
      adb('shell', 'settings', 'put', 'secure', 'touch_exploration_enabled', '1');
      console.log('accessibility enabled');
      break;
    case 'launch':
      adb('shell', 'am', 'force-stop', PACKAGE);
      adb('shell', 'am', 'start', '-n', ACTIVITY);
      console.log('launched');
      break;
    case 'stop':
      adb('shell', 'am', 'force-stop', PACKAGE);
      console.log('stopped');
      break;
    case 'dump': {
      const list = nodes();
      const filtered = positional[0] ? list.filter((n) => n.desc.includes(positional[0])) : list;
      console.log(JSON.stringify(filtered, null, 2));
      break;
    }
    case 'text':
      for (const node of nodes()) console.log(JSON.stringify(node.desc));
      break;
    case 'tap':
      console.log(JSON.stringify(tap(positional[0], { index: Number(flag('index', 0)) })));
      break;
    case 'type':
      typeText(positional[0]);
      console.log('typed');
      break;
    case 'tapxy':
      adb('shell', 'input', 'tap', positional[0], positional[1]);
      console.log('tapped');
      break;
    case 'swipe': {
      // swipe <x1> <y1> <x2> <y2> [durationMs]
      adb('shell', 'input', 'swipe', positional[0], positional[1], positional[2], positional[3], positional[4] || '300');
      console.log('swiped');
      break;
    }
    case 'wait':
      console.log(JSON.stringify(waitFor(positional[0], {
        timeout: Number(flag('timeout', 20000)),
        gone: rest.includes('--gone'),
      })));
      break;
    case 'shot':
      console.log(screenshot(positional[0]));
      break;
    case 'logs': {
      const out = adb('logcat', '-d', '-v', 'brief');
      const lines = out
        .split('\n')
        .filter((line) => /flutter|AndroidRuntime|decidix|FATAL/i.test(line));
      console.log(lines.slice(-120).join('\n'));
      break;
    }
    default:
      console.error('Unknown command. See the header of this file for usage.');
      process.exit(2);
  }
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
