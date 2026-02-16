import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

/** Editor chrome: background, gutter, selection, cursor. */
export const zincDarkTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "rgb(39 39 42)", // zinc-800
      color: "rgb(244 244 245)", // zinc-100
      fontSize: "14px",
    },
    "&.cm-focused": {
      outline: "2px solid var(--color-accent)",
      outlineOffset: "1px",
    },
    ".cm-activeLine": {
      backgroundColor: "rgb(63 63 70 / 0.3)", // zinc-700/30
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgb(63 63 70 / 0.3)",
    },
    ".cm-content": {
      fontFamily:
        "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
      lineHeight: "1.625",
      padding: "8px 0",
    },
    ".cm-cursor": {
      borderLeftColor: "rgb(244 244 245)", // zinc-100
    },
    ".cm-gutterElement": {
      padding: "0 8px 0 16px",
    },
    ".cm-gutters": {
      backgroundColor: "rgb(39 39 42)", // zinc-800
      borderRight: "1px solid rgb(63 63 70)", // zinc-700
      color: "rgb(113 113 122)", // zinc-500
    },
    ".cm-matchingBracket": {
      backgroundColor: "rgb(63 63 70 / 0.5)", // zinc-700/50
      outline: "1px solid rgb(113 113 122)", // zinc-500
    },
    ".cm-selectionBackground": {
      backgroundColor: "rgb(63 63 70 / 0.6) !important", // zinc-700/60
    },
  },
  { dark: true },
);

/** Syntax colors matching the zinc dark palette. */
const highlightStyle = HighlightStyle.define([
  { color: "rgb(147 197 253)", tag: tags.keyword }, // blue-300
  { color: "rgb(134 239 172)", tag: tags.string }, // green-300
  { color: "rgb(253 186 116)", tag: tags.number }, // orange-300
  { color: "rgb(196 181 253)", tag: tags.variableName }, // violet-300
  { color: "rgb(252 211 77)", tag: tags.special(tags.string) }, // amber-300 (color codes)
  { color: "rgb(161 161 170)", tag: tags.brace }, // zinc-400
  { color: "rgb(161 161 170)", tag: tags.punctuation }, // zinc-400
]);

export const zincDarkHighlighting = syntaxHighlighting(highlightStyle);
