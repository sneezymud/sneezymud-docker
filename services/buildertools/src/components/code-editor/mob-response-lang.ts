import { StreamLanguage } from "@codemirror/language";
import { tags } from "@lezer/highlight";

/**
 * Stream-based tokenizer for the SneezyMUD mob response DSL.
 *
 * Grammar overview:
 *   trigger {"pattern";     — trigger keyword + opening brace + pattern
 *     action arguments;     — action keyword + freeform text
 *     %n %N %o %r $n        — variable substitutions
 *     <r> <g> <b> ...       — color codes (single-letter in angle brackets)
 *   }                       — closing brace
 */

interface MobResponseState {
  lineStart: boolean;
}

const TRIGGERS = new Set(["give", "package", "roomenter", "say"]);

const ACTIONS = new Set(["emote", "link", "say", "tonotvict", "tovict"]);

const FLOW = new Set(["if", "random", "randoption"]);

const COLOR_LETTERS = new Set([
  "b",
  "c",
  "g",
  "k",
  "o",
  "p",
  "r",
  "R",
  "w",
  "W",
  "z",
]);

export const mobResponseLanguage = StreamLanguage.define<MobResponseState>({
  copyState(state) {
    return { lineStart: state.lineStart };
  },

  startState() {
    return { lineStart: true };
  },

  token(stream, state) {
    if (stream.eatSpace()) {
      return null;
    }

    // Braces
    if (stream.eat("{") !== undefined) {
      state.lineStart = false;
      return "brace";
    }
    if (stream.eat("}") !== undefined) {
      state.lineStart = true;
      return "brace";
    }

    // Semicolons
    if (stream.eat(";") !== undefined) {
      state.lineStart = false;
      return "punctuation";
    }

    // Variables: %n, %N, %o, %r, $n, etc.
    if (stream.eat("%") !== undefined || stream.eat("$") !== undefined) {
      stream.eat(/[a-z]/i);
      state.lineStart = false;
      return "variableName";
    }

    // Color codes: <r>, <g>, etc.
    if (stream.peek() === "<") {
      const saved = stream.pos;
      stream.next();
      const ch = stream.next();
      if (
        ch !== undefined &&
        stream.eat(">") !== undefined &&
        COLOR_LETTERS.has(ch)
      ) {
        state.lineStart = false;
        return "color";
      }
      stream.pos = saved;
    }

    // Quoted strings
    if (stream.peek() === '"') {
      stream.next();
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === '"') {
          break;
        }
      }
      state.lineStart = false;
      return "string";
    }

    // Words
    if (/[a-z_]/i.test(stream.peek() ?? "")) {
      stream.match(/^[a-z_]\w*/i);
      const word = stream.current();
      const isLineStart = state.lineStart;
      state.lineStart = false;

      if (isLineStart && TRIGGERS.has(word)) {
        return "keyword";
      }
      if (FLOW.has(word)) {
        return "keyword";
      }
      if (!isLineStart && ACTIONS.has(word)) {
        return "keyword";
      }
      return null;
    }

    // Numbers
    if (/\d/.test(stream.peek() ?? "")) {
      stream.match(/^\d+/);
      state.lineStart = false;
      return "number";
    }

    stream.next();
    state.lineStart = false;
    return null;
  },

  tokenTable: {
    brace: tags.brace,
    color: tags.special(tags.string),
  },
});
