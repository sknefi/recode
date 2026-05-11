import type { CodeTheme, Language, PracticeMode } from "../types/exercise";
import { CodeEditor } from "./CodeEditor";

type ReferencePanelProps = {
  mode: PracticeMode;
  language: Language;
  codeTheme: CodeTheme;
  displayReferenceCode: string;
  displayPromptCode: string;
};

export const ReferencePanel = ({
  mode,
  language,
  codeTheme,
  displayReferenceCode,
  displayPromptCode,
}: ReferencePanelProps) => {
  if (mode === "exact" || mode === "exam") {
    return (
      <section className="panel reference-panel hidden-reference">
        <p className="eyebrow">Reference</p>
        <h2>{mode === "exam" ? "Exam Mode" : "Hidden"}</h2>
        <p className="muted">
          {mode === "exam"
            ? "Write the solution without hints. Feedback appears after submit."
            : "Write the solution from memory. Submit when ready."}
        </p>
      </section>
    );
  }

  const label = mode === "fog" ? "Blurred Reference" : "Prompt";
  const code = mode === "fog" ? displayReferenceCode : displayPromptCode;

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
          readOnly
          ariaLabel={label}
        />
      </div>
    </section>
  );
};
