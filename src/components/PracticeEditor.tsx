import { ArrowLeft, Check, RotateCcw } from "lucide-react";
import type { CodeTheme, Language, LineStatus } from "../types/exercise";
import { formatDuration } from "../lib/format";
import { CodeEditor } from "./CodeEditor";

type PracticeEditorProps = {
  title: string;
  language: Language;
  codeTheme: CodeTheme;
  attemptCode: string;
  onAttemptCodeChange: (value: string) => void;
  lineStatuses: Array<{ lineNumber: number; status: LineStatus }>;
  elapsedMs: number;
  showTimer: boolean;
  visibleMismatchCount: number;
  onSubmit: () => void;
  onRestart: () => void;
  onBack: () => void;
};

export const PracticeEditor = ({
  title,
  language,
  codeTheme,
  attemptCode,
  onAttemptCodeChange,
  lineStatuses,
  elapsedMs,
  showTimer,
  visibleMismatchCount,
  onSubmit,
  onRestart,
  onBack,
}: PracticeEditorProps) => {
  return (
    <section className="panel practice-panel">
      <div className="practice-toolbar">
        <div>
          <p className="eyebrow">Attempt</p>
          <h2>{title || "Untitled exercise"}</h2>
        </div>

        <div className="stat-row">
          {showTimer && (
            <span>
              <strong>{formatDuration(elapsedMs)}</strong>
              Time
            </span>
          )}
          <span>
            <strong>{visibleMismatchCount}</strong>
            Visible mistakes
          </span>
        </div>
      </div>

      <div className="editor-shell practice-editor">
        <CodeEditor
          value={attemptCode}
          onChange={onAttemptCodeChange}
          language={language}
          codeTheme={codeTheme}
          lineStatuses={lineStatuses}
          ariaLabel="Practice code editor"
        />
      </div>

      <div className="action-row">
        <div className="action-cluster">
          <button type="button" className="ghost-button" onClick={onBack}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </button>
          <button type="button" className="ghost-button" onClick={onRestart}>
            <RotateCcw size={16} aria-hidden="true" />
            Restart
          </button>
        </div>
        <button type="button" className="primary-action compact" onClick={onSubmit}>
          <Check size={18} aria-hidden="true" />
          Submit
        </button>
      </div>
    </section>
  );
};
