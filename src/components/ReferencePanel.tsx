import type { CodeTheme, Language, PracticeMode } from "../types/exercise";
import { CodeEditor } from "./CodeEditor";

type ReferencePanelProps = {
  mode: PracticeMode;
  language: Language;
  codeTheme: CodeTheme;
  displayReferenceCode: string;
  displayPromptCode: string;
  highlightedLineNumber: number | null;
};

export const ReferencePanel = ({
  mode,
  language,
  codeTheme,
  displayReferenceCode,
  displayPromptCode,
  highlightedLineNumber,
}: ReferencePanelProps) => {
  if (mode === "exam") {
    return (
      <section className="panel reference-panel hidden-reference">
        <p className="eyebrow">Reference</p>
        <h2>Exam Mode</h2>
        <p className="muted">
          Write the solution without hints. Feedback appears after submit.
        </p>
      </section>
    );
  }

  const label =
    mode === "fog"
      ? "Blurred Reference"
      : mode === "reference"
        ? "Full Reference"
        : "Prompt";
  const code = mode === "fog" || mode === "reference" ? displayReferenceCode : displayPromptCode;

  return (
    <section className="panel reference-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Reference</p>
          <h2>{label}</h2>
        </div>
      </div>

      <div className={`editor-shell reference-editor ${mode === "fog" ? "fogged" : ""}`}>
        <CodeEditor
          value={code}
          language={language}
          codeTheme={codeTheme}
          highlightedLineNumber={highlightedLineNumber}
          readOnly
          ariaLabel={label}
        />
      </div>
    </section>
  );
};
