import { useCodeMirror } from "@/hooks/use-codemirror.ts";

import { mobResponseLanguage } from "./mob-response-lang.ts";
import { zincDarkHighlighting, zincDarkTheme } from "./theme.ts";

interface CodeEditorProps {
  onChange: (value: string) => void;
  onSave?: (() => void) | undefined;
  value: string;
}

const extensions = [mobResponseLanguage, zincDarkTheme, zincDarkHighlighting];

export function CodeEditor({ onChange, onSave, value }: CodeEditorProps) {
  const containerRef = useCodeMirror({
    extensions,
    onChange,
    onSave,
    value,
  });

  return (
    <div
      aria-label="Response script editor"
      className="border-border min-h-100 flex-1 overflow-hidden rounded border"
      ref={containerRef}
    />
  );
}
