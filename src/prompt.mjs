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

/** Move up n lines and clear from there down — used to redraw the menu in place. */
function clearLines(n) {
  if (n > 0) stdout.write(`${ESC}[${n}A`);
  stdout.write(`${ESC}[0J`);
}

/**
 * Read single keypresses until `onKey` signals completion.
 * onKey(key) returns { done: true, value } to finish, or falsy to keep listening.
 */
function readKeys(onKey) {
  return new Promise((resolve, reject) => {
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const cleanup = () => {
      stdin.setRawMode(wasRaw ?? false);
      stdin.pause();
      stdin.removeListener('data', handler);
      setCursor(true);
    };

    function handler(key) {
      // Ctrl+C / Ctrl+D must always escape, whatever the prompt is doing.
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
        return;
      }

      if (result && result.done) {
        cleanup();
        resolve(result.value);
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
    // Ignore escape sequences (arrows etc.) and other control chars.
    if (key.startsWith(ESC) || key < ' ') return null;

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
