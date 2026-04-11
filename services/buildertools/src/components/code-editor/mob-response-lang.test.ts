import { StringStream } from "@codemirror/language";
import { describe, expect, test } from "bun:test";

import {
  mobResponseParser,
  type MobResponseState,
} from "./mob-response-lang.ts";

interface Token {
  type: null | string;
  value: string;
}

function freshState(): MobResponseState {
  // startState is optional on StreamParser, but this one always provides it.
  // Guarded call keeps TypeScript's strictness happy.
  if (!mobResponseParser.startState) {
    throw new Error("mobResponseParser.startState is required");
  }
  return mobResponseParser.startState(2);
}

function tokenizeLine(
  line: string,
  initialState: MobResponseState = freshState(),
): { state: MobResponseState; tokens: Token[] } {
  const stream = new StringStream(line, 4, 2, undefined);
  const state = { ...initialState };
  const tokens: Token[] = [];
  let safetyCounter = 0;
  while (!stream.eol()) {
    stream.start = stream.pos;
    const type = mobResponseParser.token(stream, state);
    if (stream.pos === stream.start) {
      break;
    }
    const value = line.slice(stream.start, stream.pos);
    if (value.trim() !== "" || type !== null) {
      tokens.push({ type, value });
    }
    safetyCounter += 1;
    if (safetyCounter > 1000) {
      throw new Error("tokenizer did not terminate");
    }
  }
  return { state, tokens };
}

function tokenize(input: string): Token[] {
  let state = freshState();
  const all: Token[] = [];
  for (const line of input.split("\n")) {
    const result = tokenizeLine(line, state);
    all.push(...result.tokens);
    state = result.state;
  }
  return all;
}

describe("mobResponseParser.token", () => {
  describe("triggers at line start", () => {
    test.each(["say", "roomenter", "package", "give"])(
      "trigger %s at line start is a keyword",
      (word) => {
        const { tokens } = tokenizeLine(`${word} {`);
        expect(tokens[0]).toEqual({ type: "keyword", value: word });
      },
    );

    test("trigger 'roomenter' mid-line is not a keyword", () => {
      // 'roomenter' is in TRIGGERS but not in ACTIONS, so mid-line it falls
      // through to the non-keyword branch. ('say' is in both sets, which is
      // why it keeps keyword classification regardless of position.)
      const { tokens } = tokenizeLine("say {ok; roomenter");
      const roomenterTokens = tokens.filter((t) => t.value === "roomenter");
      expect(roomenterTokens).toHaveLength(1);
      expect(roomenterTokens[0]?.type).toBeNull();
    });
  });

  describe("actions mid-line", () => {
    test.each(["tovict", "tonotvict", "emote", "link"])(
      "action %s after a semicolon (mid-line) is a keyword",
      (word) => {
        const { tokens } = tokenizeLine(`say {${word} hi;}`);
        const actionToken = tokens.find((t) => t.value === word);
        expect(actionToken?.type).toBe("keyword");
      },
    );

    test("action 'tovict' at line start is not a keyword", () => {
      const { tokens } = tokenizeLine("tovict hi;");
      expect(tokens[0]).toEqual({ type: null, value: "tovict" });
    });
  });

  describe("flow keywords", () => {
    test.each(["if", "random", "randoption"])(
      "%s at line start is a keyword",
      (word) => {
        const { tokens } = tokenizeLine(`${word} foo`);
        expect(tokens[0]?.type).toBe("keyword");
      },
    );

    test("'if' mid-line is still a keyword", () => {
      const { tokens } = tokenizeLine("say {if cond}");
      const ifToken = tokens.find((t) => t.value === "if");
      expect(ifToken?.type).toBe("keyword");
    });
  });

  describe("variables", () => {
    test.each(["%n", "%N", "%o", "%r", "$n"])(
      "%s is a variableName token",
      (variable) => {
        const { tokens } = tokenizeLine(`say {emote waves at ${variable};}`);
        const token = tokens.find((t) => t.value === variable);
        expect(token?.type).toBe("variableName");
      },
    );
  });

  describe("color codes", () => {
    test.each(["<r>", "<g>", "<b>", "<W>", "<z>"])(
      "%s is a color token",
      (code) => {
        const { tokens } = tokenizeLine(`say {${code} hi;}`);
        const token = tokens.find((t) => t.value === code);
        expect(token?.type).toBe("color");
      },
    );

    test("unknown color letter like <x> does not produce a color token", () => {
      const { tokens } = tokenizeLine("say {<x> hi;}");
      // The tokenizer rewinds and treats the '<' as a one-char unknown.
      const angleTokens = tokens.filter((t) => t.value.includes("<"));
      for (const token of angleTokens) {
        expect(token.type).not.toBe("color");
      }
    });

    test("multi-letter angle code like <ab> does not produce a color token", () => {
      const { tokens } = tokenizeLine("say {<ab> hi;}");
      const angleTokens = tokens.filter((t) => t.value.includes("<"));
      for (const token of angleTokens) {
        expect(token.type).not.toBe("color");
      }
    });
  });

  describe("quoted strings", () => {
    test("string with closing quote is a string token", () => {
      const { tokens } = tokenizeLine('say {"hello"}');
      const stringToken = tokens.find((t) => t.type === "string");
      expect(stringToken?.value).toBe('"hello"');
    });

    test("unterminated string at EOL does not crash", () => {
      expect(() => tokenizeLine('say {"unterminated')).not.toThrow();
      const { tokens } = tokenizeLine('say {"unterminated');
      const stringToken = tokens.find((t) => t.type === "string");
      expect(stringToken?.value).toBe('"unterminated');
    });
  });

  describe("numbers", () => {
    test("plain integer is a number token", () => {
      const { tokens } = tokenizeLine("if 42");
      const numToken = tokens.find((t) => t.value === "42");
      expect(numToken?.type).toBe("number");
    });
  });

  describe("brace state flipping", () => {
    test("after an opening brace, lineStart is false", () => {
      const { state } = tokenizeLine("say {");
      expect(state.lineStart).toBe(false);
    });

    test("after a closing brace, lineStart is true", () => {
      const { state } = tokenizeLine("say {hi;}");
      expect(state.lineStart).toBe(true);
    });

    test("trigger on a line after a closing brace is still a keyword", () => {
      const tokens = tokenize('say {"a";}\nroomenter {');
      const roomenter = tokens.find((t) => t.value === "roomenter");
      expect(roomenter?.type).toBe("keyword");
    });
  });
});
