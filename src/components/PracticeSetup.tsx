import { RefreshCw } from "lucide-react";
import { CodeEditor } from "./CodeEditor";
import type {
  CodeTheme,
  FeedbackTiming,
  IdentifierMode,
  Language,
  MissingPiecesConfig,
  MissingPiecePattern,
  PromptMaskConfig,
  PracticeMode,
  SkeletonConfig,
  Strictness,
} from "../types/exercise";
import { formatModeLabel } from "../lib/format";

type PracticeSetupProps = {
  mode: PracticeMode;
  onModeChange: (value: PracticeMode) => void;
  language: Language;
  codeTheme: CodeTheme;
  onCodeThemeChange: (value: CodeTheme) => void;
  strictness: Strictness;
  onStrictnessChange: (value: Strictness) => void;
  identifierMode: IdentifierMode;
  onIdentifierModeChange: (value: IdentifierMode) => void;
  feedbackTiming: FeedbackTiming;
  onFeedbackTimingChange: (value: FeedbackTiming) => void;
  showTimer: boolean;
  onShowTimerChange: (value: boolean) => void;
  promptMask: PromptMaskConfig;
  onPromptMaskChange: (value: PromptMaskConfig) => void;
  skeleton: SkeletonConfig;
  onSkeletonChange: (value: SkeletonConfig) => void;
  missingPieces: MissingPiecesConfig;
  onMissingPiecesChange: (value: MissingPiecesConfig) => void;
  blankedLines: number[];
  skeletonCode: string;
  onSkeletonCodeChange: (value: string) => void;
  onRegenerateSkeleton: () => void;
  previewCode: string;
  onStart: () => void;
  onContinue: () => void;
  canStart: boolean;
  canContinue: boolean;
};

const modes: Array<{ value: PracticeMode; title: string; body: string }> = [
  {
    value: "reference",
    title: "Reference Mode",
    body: "Full reference visible while you type.",
  },
  {
    value: "fog",
    title: "Fog Mode",
    body: "Reference visible with blur while you type.",
  },
  {
    value: "missing-pieces",
    title: "Missing Pieces",
    body: "Start with blanks and fill the hidden lines.",
  },
  {
    value: "skeleton",
    title: "Function Skeleton",
    body: "Start from a shell and rebuild the body.",
  },
  {
    value: "exam",
    title: "Exam Mode",
    body: "No prompt. No feedback until submit.",
  },
];

const feedbackOptions: Array<{ value: FeedbackTiming; label: string }> = [
  { value: "line", label: "Line check" },
  { value: "instant", label: "Instant" },
  { value: "submit", label: "Submit only" },
];

const strictnessOptions: Array<{ value: Strictness; label: string }> = [
  { value: "strict", label: "Strict" },
  { value: "whitespace-tolerant", label: "Whitespace tolerant" },
];

const identifierOptions: Array<{ value: IdentifierMode; label: string }> = [
  { value: "exact", label: "Exact" },
  { value: "flexible", label: "Flexible" },
];

const codeThemeOptions: Array<{ value: CodeTheme; label: string }> = [
  { value: "classic", label: "Classic" },
  { value: "vscode-dark", label: "VS Code Dark" },
  { value: "vscode-light", label: "VS Code Light" },
  { value: "github-dark", label: "GitHub Dark" },
  { value: "monokai", label: "Monokai" },
  { value: "dracula", label: "Dracula" },
  { value: "neon", label: "Neon" },
];

const patternOptions: MissingPiecePattern[] = [
  "import",
  "return",
  "if",
  "elif",
  "else",
  "while",
  "for",
  "try",
  "except",
  "with",
  "def",
];

const cPatternOptions: MissingPiecePattern[] = [
  "include",
  "return",
  "if",
  "else",
  "while",
  "for",
];

const pythonPatternOptions: MissingPiecePattern[] = patternOptions;

export const PracticeSetup = ({
  mode,
  onModeChange,
  language,
  codeTheme,
  onCodeThemeChange,
  strictness,
  onStrictnessChange,
  identifierMode,
  onIdentifierModeChange,
  feedbackTiming,
  onFeedbackTimingChange,
  showTimer,
  onShowTimerChange,
  promptMask,
  onPromptMaskChange,
  skeleton,
  onSkeletonChange,
  missingPieces,
  onMissingPiecesChange,
  blankedLines,
  skeletonCode,
  onSkeletonCodeChange,
  onRegenerateSkeleton,
  previewCode,
  onStart,
  onContinue,
  canStart,
  canContinue,
}: PracticeSetupProps) => {
  const updateMissingPieces = (patch: Partial<MissingPiecesConfig>) => {
    onMissingPiecesChange({
      ...missingPieces,
      ...patch,
    });
  };

  const updatePromptMask = (patch: Partial<PromptMaskConfig>) => {
    onPromptMaskChange({
      ...promptMask,
      ...patch,
    });
  };

  const updateSkeleton = (patch: Partial<SkeletonConfig>) => {
    onSkeletonChange({
      ...skeleton,
      ...patch,
    });
  };

  const visiblePatternOptions =
    language === "python" ? pythonPatternOptions : cPatternOptions;

  return (
    <section className="panel setup-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Practice</p>
          <h2>Choose Mode</h2>
        </div>
      </div>

      <div className="mode-grid">
        {modes.map((entry) => (
          <button
            key={entry.value}
            type="button"
            className={`mode-option ${mode === entry.value ? "selected" : ""}`}
            onClick={() => onModeChange(entry.value)}
          >
            <strong>{entry.title}</strong>
            <span>{entry.body}</span>
          </button>
        ))}
      </div>

      <div className="settings-grid">
        <div className="setting-group">
          <span className="setting-label">Strictness</span>
          <div className="segmented">
            {strictnessOptions.map((entry) => (
              <button
                key={entry.value}
                type="button"
                className={strictness === entry.value ? "active" : ""}
                onClick={() => onStrictnessChange(entry.value)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <span className="setting-label">Names</span>
          <div className="segmented">
            {identifierOptions.map((entry) => (
              <button
                key={entry.value}
                type="button"
                className={identifierMode === entry.value ? "active" : ""}
                onClick={() => onIdentifierModeChange(entry.value)}
              >
                {entry.value === "flexible" ? (
                  <span className="option-with-badge">
                    {entry.label}
                    <span className="beta-badge">Beta</span>
                  </span>
                ) : (
                  entry.label
                )}
              </button>
            ))}
          </div>
        </div>

        {mode === "exam" ? (
          <div className="setting-group">
            <span className="setting-label">Feedback</span>
            <div className="locked-setting">Submit only</div>
          </div>
        ) : (
          <div className="setting-group">
            <span className="setting-label">Feedback</span>
            <div className="segmented">
              {feedbackOptions.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  className={feedbackTiming === entry.value ? "active" : ""}
                  onClick={() => onFeedbackTimingChange(entry.value)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="field">
          <span>Code Theme</span>
          <select
            value={codeTheme}
            onChange={(event) => onCodeThemeChange(event.target.value as CodeTheme)}
          >
            {codeThemeOptions.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <div className="setting-group">
          <span className="setting-label">Timer</span>
          <label className="toggle-field">
            <input
              type="checkbox"
              checked={showTimer}
              onChange={(event) => onShowTimerChange(event.target.checked)}
            />
            <span>Show during practice</span>
          </label>
        </div>

        {mode !== "reference" && mode !== "exam" && (
          <div className="setting-group">
            <span className="setting-label">Masks</span>
            <div className="toggle-stack">
              <label className="toggle-field">
                <input
                  type="checkbox"
                  checked={promptMask.hideNames}
                  onChange={(event) =>
                    updatePromptMask({ hideNames: event.target.checked })
                  }
                />
                <span>Hide names</span>
              </label>
              <label className="toggle-field">
                <input
                  type="checkbox"
                  checked={promptMask.hideValues}
                  onChange={(event) =>
                    updatePromptMask({ hideValues: event.target.checked })
                  }
                />
                <span>Hide values</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {mode === "missing-pieces" && (
        <div className="mode-config">
          <div className="form-grid">
            <label className="field">
              <span>Blank strategy</span>
              <select
                value={missingPieces.strategy}
                onChange={(event) =>
                  updateMissingPieces({
                    strategy: event.target.value as MissingPiecesConfig["strategy"],
                  })
                }
              >
                <option value="pattern">Pattern based</option>
                <option value="every-nth">Every Nth content line</option>
                <option value="manual">Manual line numbers</option>
              </select>
            </label>

            {missingPieces.strategy === "every-nth" && (
              <label className="field">
                <span>Every Nth line</span>
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={missingPieces.everyNth}
                  onChange={(event) =>
                    updateMissingPieces({ everyNth: Number(event.target.value) })
                  }
                />
              </label>
            )}

            {missingPieces.strategy === "manual" && (
              <label className="field">
                <span>Lines</span>
                <input
                  value={missingPieces.manualLines}
                  onChange={(event) =>
                    updateMissingPieces({ manualLines: event.target.value })
                  }
                  placeholder="3, 5, 8-10"
                />
              </label>
            )}
          </div>

          {missingPieces.strategy === "pattern" && (
            <div className="checkbox-row">
              {visiblePatternOptions.map((pattern) => (
                <label key={pattern} className="check-field">
                  <input
                    type="checkbox"
                    checked={missingPieces.patterns.includes(pattern)}
                    onChange={(event) => {
                      const nextPatterns = event.target.checked
                        ? [...missingPieces.patterns, pattern]
                        : missingPieces.patterns.filter((item) => item !== pattern);

                      updateMissingPieces({ patterns: nextPatterns });
                    }}
                  />
                  <span>{pattern}</span>
                </label>
              ))}
            </div>
          )}

          <p className="muted">
            Affected lines: {blankedLines.length}
            {blankedLines.length > 0 ? ` (${blankedLines.join(", ")})` : ""}
          </p>
        </div>
      )}

      {mode === "skeleton" && (
        <div className="mode-config">
          <div className="inline-heading">
            <span className="setting-label">Skeleton</span>
            <button type="button" className="ghost-button" onClick={onRegenerateSkeleton}>
              <RefreshCw size={16} aria-hidden="true" />
              Regenerate
            </button>
          </div>
          <label className="toggle-field skeleton-toggle">
            <input
              type="checkbox"
              checked={skeleton.includeImports}
              onChange={(event) =>
                updateSkeleton({ includeImports: event.target.checked })
              }
            />
            <span>Include imports/includes</span>
          </label>
          <textarea
            className="skeleton-textarea"
            value={skeletonCode}
            onChange={(event) => onSkeletonCodeChange(event.target.value)}
            rows={6}
          />
        </div>
      )}

      <div className="mode-config">
        <div className="inline-heading">
          <span className="setting-label">Preview</span>
          <span className="preview-badge">{formatModeLabel(mode)}</span>
        </div>
        <div className={`editor-shell preview-editor ${mode === "fog" ? "fogged" : ""}`}>
          <CodeEditor
            value={previewCode}
            language={language}
            codeTheme={codeTheme}
            readOnly
            ariaLabel="Practice preview"
          />
        </div>
      </div>

      <div className="start-actions">
        {canContinue && (
          <button
            type="button"
            className="ghost-button continue-action"
            onClick={onContinue}
          >
            Continue
          </button>
        )}
        <button
          type="button"
          className="primary-action"
          onClick={onStart}
          disabled={!canStart}
        >
          {canContinue ? "Start New" : `Start ${formatModeLabel(mode)}`}
        </button>
      </div>
    </section>
  );
};
