import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { useEffect, useRef } from "react";

import { mobResponseLanguage } from "./mob-response-lang.ts";
import { zincDarkHighlighting, zincDarkTheme } from "./theme.ts";

interface CodeEditorProps {
  onChange: (value: string) => void;
  onSave?: (() => void) | undefined;
  value: string;
}

export function CodeEditor({ onChange, onSave, value }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const initialValueRef = useRef(value);

  // Keep callback refs current without accessing .current during render
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Create editor on mount, destroy on unmount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const saveKeyBinding = keymap.of([
      {
        key: "Mod-s",
        run: () => {
          onSaveRef.current?.();
          return true;
        },
      },
    ]);

    const view = new EditorView({
      parent: container,
      state: EditorState.create({
        doc: initialValueRef.current,
        extensions: [
          lineNumbers(),
          history(),
          bracketMatching(),
          mobResponseLanguage,
          zincDarkTheme,
          zincDarkHighlighting,
          saveKeyBinding,
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.lineWrapping,
          updateListener,
        ],
      }),
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Sync external value changes into the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      view.dispatch({
        changes: { from: 0, insert: value, to: currentDoc.length },
      });
    }
  }, [value]);

  return (
    <div
      className="min-h-[400px] flex-1 overflow-hidden rounded border border-zinc-700"
      ref={containerRef}
    />
  );
}
