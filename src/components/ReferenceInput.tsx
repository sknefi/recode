import type { CodeTheme, Language } from "../types/exercise";
import { CodeEditor } from "./CodeEditor";

type ReferenceInputProps = {
  title: string;
  onTitleChange: (value: string) => void;
  language: Language;
  onLanguageChange: (value: Language) => void;
  codeTheme: CodeTheme;
  referenceCode: string;
  onReferenceCodeChange: (value: string) => void;
  validationMessage?: string;
};

const languages: Array<{ value: Language; label: string }> = [
  { value: "c", label: "C" },
  { value: "python", label: "Python" },
];

export const ReferenceInput = ({
  title,
  onTitleChange,
  language,
  onLanguageChange,
  codeTheme,
  referenceCode,
  onReferenceCodeChange,
  validationMessage,
}: ReferenceInputProps) => {
  return (
    <section className="panel input-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Reference</p>
          <h2>Paste Code</h2>
        </div>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Title</span>
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="ft_strlen, binary search, SQL join template..."
          />
        </label>

        <label className="field">
          <span>Language</span>
          <select
            value={language}
            onChange={(event) => onLanguageChange(event.target.value as Language)}
          >
            {languages.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="editor-shell setup-editor">
        <CodeEditor
          value={referenceCode}
          onChange={onReferenceCodeChange}
          language={language}
          codeTheme={codeTheme}
          ariaLabel="Reference code editor"
        />
      </div>
      {validationMessage && (
        <p className="validation-message" role="alert">
          {validationMessage}
        </p>
      )}
    </section>
  );
};
