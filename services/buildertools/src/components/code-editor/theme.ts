import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

/** Editor chrome: background, gutter, selection, cursor. Uses CSS variables
 *  so the editor adapts if the app palette changes. */
export const zincDarkTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--secondary)",
      color: "var(--foreground)",
      fontSize: "14px",
    },
    "&.cm-focused": {
      outline: "2px solid var(--color-accent)",
      outlineOffset: "1px",
    },
    ".cm-activeLine": {
      backgroundColor:
        "color-mix(in oklch, var(--muted-foreground) 15%, transparent)",
    },
    ".cm-activeLineGutter": {
      backgroundColor:
        "color-mix(in oklch, var(--muted-foreground) 15%, transparent)",
    },
    ".cm-content": {
      fontFamily:
        "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
      lineHeight: "1.625",
      padding: "8px 0",
    },
    ".cm-cursor": {
      borderLeftColor: "var(--foreground)",
    },
    ".cm-gutterElement": {
      padding: "0 8px 0 16px",
    },
    ".cm-gutters": {
      backgroundColor: "var(--secondary)",
      borderRight: "1px solid var(--border)",
      color: "var(--muted-foreground)",
    },
    ".cm-matchingBracket": {
      backgroundColor:
        "color-mix(in oklch, var(--muted-foreground) 25%, transparent)",
      outline: "1px solid var(--muted-foreground)",
    },
    ".cm-selectionBackground": {
      backgroundColor:
        "color-mix(in oklch, var(--muted-foreground) 30%, transparent) !important",
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
