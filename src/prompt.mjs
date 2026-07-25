// Keyboard-driven prompts: arrow-key single select and spacebar checkboxes.
// Zero dependencies — raw TTY keypress handling, so the installer never fails
// in a classroom because of a missing package.

import { stdin, stdout } from 'node:process';

const ESC = '';
const KEY = {
  up: `${ESC}[A`,
  down: `${ESC}[B`,
  ctrlC: '',
  ctrlD: '',
  enter: '\r',
  newline: '\n',
  space: ' ',
};

const c = {
  dim: (s) => `[2m${s}[0m`,
  cyan: (s) => `[36m${s}[0m`,
  green: (s) => `[32m${s}[0m`,
  bold: (s) => `[1m${s}[0m`,
};

/** Hide/show the cursor so the redrawing menu doesn't flicker a caret around. */
function setCursor(visible) {
  stdout.write(visible ? `${ESC}[?25h` : `${ESC}[?25l`);
}

// A throw anywhere outside the keypress handler would otherwise exit with the
// terminal still in raw mode and the cursor hidden — leaving the user's shell
// with invisible, unechoed input. One idempotent restore covers every exit path,
// including process.exit().
let restoreRegistered = false;
function registerTerminalRestore() {
  if (restoreRegistered) return;
  restoreRegistered = true;
  process.on('exit', () => {
    try {
      if (stdin.isTTY && stdin.isRaw) stdin.setRawMode(false);
      stdout.write(`${ESC}[?25h`);
    } catch {
      // Nothing useful to do while the process is already exiting.
    }
  });
}

/** Move up n lines and clear from there down — used to redraw the menu in place. */
function clearLines(n) {
  if (n > 0) stdout.write(`${ESC}[${n}A`);
  stdout.write(`${ESC}[0J`);
}

/**
 * Split one stdin chunk into individual keys.
 *
 * stdin delivers DATA, not keystrokes: holding Enter (key auto-repeat), typing
 * fast, pasting, or running over SSH/tmux routinely packs several keys into one
 * chunk. Comparing a whole chunk against '\r' then matches nothing, so the key
 * is silently dropped and the prompt hangs — the worst kind of failure, because
 * there is no error to see. Escape sequences (arrows) must stay intact as one
 * key; everything else is per-character.
 */
function splitKeys(chunk) {
  const keys = [];
  let i = 0;

  while (i < chunk.length) {
    if (chunk[i] === ESC) {
      // CSI sequence: ESC [ ... final-byte (@ through ~). Arrows are ESC[A..D.
      const match = /^\x1b\[[0-9;?]*[ -/]*[@-~]/.exec(chunk.slice(i));
      if (match) {
        keys.push(match[0]);
        i += match[0].length;
        continue;
      }
      // ESC alone, or an unrecognised sequence — take just the ESC.
      keys.push(chunk[i]);
      i += 1;
      continue;
    }
    keys.push(chunk[i]);
    i += 1;
  }

  return keys;
}

/**
 * Read single keypresses until `onKey` signals completion.
 * onKey(key) returns { done: true, value } to finish, or falsy to keep listening.
 */
// Keys that arrive between prompts — while one question has resolved and the
// next hasn't attached its listener yet — would otherwise be dropped on the
// floor. Holding Enter produces exactly that. Buffer them and replay into the
// next prompt so no keystroke is ever silently lost.
const pendingKeys = [];

/**
 * Start capturing keystrokes immediately, before the first prompt renders.
 * Node takes a moment to boot and draw; anything typed in that window is
 * otherwise lost. Call once at CLI start.
 */
export function beginTypeAhead() {
  if (!stdin.isTTY) return;
  registerTerminalRestore();
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  stdin.on('data', bufferEarlyKeys);
}

/**
 * Release stdin so the process can exit.
 *
 * An open stdin listener keeps Node's event loop alive indefinitely, so any
 * command that finishes WITHOUT going through a prompt's cleanup (an early
 * return, an error path, a completed run) leaves the terminal hanging with no
 * output and no prompt back. `process.exitCode` sets the code but does not
 * exit. Every command path must end here.
 */
export function endTypeAhead() {
  if (!stdin.isTTY) return;
  stdin.removeListener('data', bufferEarlyKeys);
  try {
    if (stdin.isRaw) stdin.setRawMode(false);
  } catch {
    // Terminal already gone.
  }
  stdin.pause();
}

function bufferEarlyKeys(chunk) {
  pendingKeys.push(...splitKeys(chunk));
}

function readKeys(onKey) {
  return new Promise((resolve, reject) => {
    registerTerminalRestore();
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.removeListener('data', bufferEarlyKeys);

    const cleanup = () => {
      stdin.setRawMode(wasRaw ?? false);
      stdin.removeListener('data', handler);
      // Resume early-capture so keys typed between prompts aren't lost.
      stdin.on('data', bufferEarlyKeys);
      setCursor(true);
    };

    /** Feed one key to onKey. Returns true when the prompt is finished. */
    const dispatch = (key) => {
      if (key === KEY.ctrlC || key === KEY.ctrlD) {
        cleanup();
        stdout.write('\n\nCancelled — nothing was written.\n');
        process.exit(130);
      }

      let result;
      try {
        result = onKey(key);
      } catch (err) {
        cleanup();
        reject(err);
        return true;
      }

      if (result && result.done) {
        cleanup();
        resolve(result.value);
        return true;
      }
      return false;
    };

    // Replay anything typed ahead of this prompt before listening for more.
    while (pendingKeys.length) {
      if (dispatch(pendingKeys.shift())) return;
    }

    function handler(chunk) {
      // One chunk can carry several keys. Dispatch them one at a time; once a
      // key completes this prompt, park the rest for the next one rather than
      // discarding them.
      const keys = splitKeys(chunk);
      for (let i = 0; i < keys.length; i++) {
        if (dispatch(keys[i])) {
          pendingKeys.push(...keys.slice(i + 1));
          return;
        }
      }
    }

    stdin.on('data', handler);
  });
}

/**
 * Arrow-key single select. `choices` is [{ label, value, hint }].
 * Returns the chosen `value`.
 */
export async function select(question, choices, defaultIndex = 0) {
  let index = defaultIndex;
  let drawn = 0;

  const render = () => {
    clearLines(drawn);
    let out = `${c.bold('?')} ${question}  ${c.dim('↑↓ to move, Enter to pick')}\n`;
    for (let i = 0; i < choices.length; i++) {
      const active = i === index;
      const pointer = active ? c.cyan('❯') : ' ';
      const label = active ? c.cyan(choices[i].label) : choices[i].label;
      const hint = choices[i].hint ? `  ${c.dim(choices[i].hint)}` : '';
      out += `${pointer} ${label}${hint}\n`;
    }
    stdout.write(out);
    drawn = choices.length + 1;
  };

  setCursor(false);
  render();

  const value = await readKeys((key) => {
    if (key === KEY.up) {
      index = (index - 1 + choices.length) % choices.length;
      render();
    } else if (key === KEY.down) {
      index = (index + 1) % choices.length;
      render();
    } else if (key === KEY.enter || key === KEY.newline) {
      return { done: true, value: choices[index].value };
    }
    return null;
  });

  // Collapse the menu to a single answered line.
  clearLines(drawn);
  const chosen = choices.find((ch) => ch.value === value);
  stdout.write(`${c.green('✔')} ${question}  ${c.cyan(chosen.label)}\n`);
  return value;
}

/**
 * Spacebar checkbox multi-select. `choices` is [{ label, value, hint, checked }].
 * Returns an array of checked `value`s. Enter with nothing checked is refused,
 * since every multi-select in this wizard needs at least one answer.
 */
export async function checkbox(question, choices) {
  let index = 0;
  let drawn = 0;
  const state = choices.map((ch) => Boolean(ch.checked));
  let warning = '';

  const render = () => {
    clearLines(drawn);
    let out = `${c.bold('?')} ${question}  ${c.dim('↑↓ move, space to toggle, Enter to confirm')}\n`;
    for (let i = 0; i < choices.length; i++) {
      const active = i === index;
      const pointer = active ? c.cyan('❯') : ' ';
      const box = state[i] ? c.green('◉') : '◯';
      const label = active ? c.cyan(choices[i].label) : choices[i].label;
      const hint = choices[i].hint ? `  ${c.dim(choices[i].hint)}` : '';
      out += `${pointer} ${box} ${label}${hint}\n`;
    }
    if (warning) out += `${c.dim(warning)}\n`;
    stdout.write(out);
    drawn = choices.length + 1 + (warning ? 1 : 0);
  };

  setCursor(false);
  render();

  const values = await readKeys((key) => {
    if (key === KEY.up) {
      index = (index - 1 + choices.length) % choices.length;
      warning = '';
      render();
    } else if (key === KEY.down) {
      index = (index + 1) % choices.length;
      warning = '';
      render();
    } else if (key === KEY.space) {
      state[index] = !state[index];
      warning = '';
      render();
    } else if (key === KEY.enter || key === KEY.newline) {
      const picked = choices.filter((_, i) => state[i]).map((ch) => ch.value);
      if (picked.length === 0) {
        warning = '  Pick at least one (space to toggle).';
        render();
        return null;
      }
      return { done: true, value: picked };
    }
    return null;
  });

  clearLines(drawn);
  const labels = choices.filter((_, i) => state[i]).map((ch) => ch.label).join(', ');
  stdout.write(`${c.green('✔')} ${question}  ${c.cyan(labels)}\n`);
  return values;
}

/**
 * Free-text input with a default. Implemented on the same raw-mode reader as
 * the menus: readline and raw mode cannot share stdin — if both are listening,
 * keystrokes go to the wrong reader and the wizard hangs. One owner, always.
 */
export async function input(question, defaultValue = '') {
  let buffer = '';
  const hint = defaultValue ? c.dim(` [${defaultValue}]`) : '';

  const render = () => {
    stdout.write(`\r${ESC}[0K${c.bold('?')} ${question}${hint} ${buffer}`);
  };

  setCursor(true);
  render();

  const value = await readKeys((key) => {
    if (key === KEY.enter || key === KEY.newline) {
      return { done: true, value: buffer.trim() || defaultValue };
    }
    // Backspace (DEL or BS)
    if (key === '' || key === '\b') {
      buffer = buffer.slice(0, -1);
      render();
      return null;
    }
    // Ignore escape sequences (arrows etc.) and any control character. Compare
    // the code point, not the string — `key < ' '` on a multi-char value tests
    // lexicographic order, not "is this a control char".
    if (key.startsWith(ESC)) return null;
    const code = key.codePointAt(0);
    if (code < 0x20 || code === 0x7f) return null;

    buffer += key;
    render();
    return null;
  });

  stdout.write(`\r${ESC}[0K${c.green('✔')} ${question}  ${c.cyan(value)}\n`);
  return value;
}

/** Yes/no as an arrow menu, so every prompt in the wizard behaves the same way. */
export async function confirm(question, defaultYes = true) {
  return select(
    question,
    [
      { label: 'Yes', value: true },
      { label: 'No', value: false },
    ],
    defaultYes ? 0 : 1
  );
}
