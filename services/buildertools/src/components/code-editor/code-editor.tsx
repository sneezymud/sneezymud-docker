import { useCodeMirror } from "./use-codemirror.ts";

interface CodeEditorProps {
  onChange: (value: string) => void;
  onSave?: (() => void) | undefined;
  value: string;
}

export function CodeEditor({ onChange, onSave, value }: CodeEditorProps) {
  const containerRef = useCodeMirror({
    onChange,
    onSave,
    value,
  });

  return (
    <div
      aria-label="Response script editor"
      className="border-border min-h-[40vh] flex-1 overflow-hidden rounded border"
      ref={containerRef}
    />
  );
}
