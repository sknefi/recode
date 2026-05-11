import type { AttemptComparison } from "../lib/compare";
import { formatDuration, formatModeLabel } from "../lib/format";
import type { PracticeAttemptSummary } from "../types/exercise";

type ResultsPanelProps = {
  comparison: AttemptComparison;
  summary: PracticeAttemptSummary;
  attempts: PracticeAttemptSummary[];
  onPracticeAgain: () => void;
  onNewExercise: () => void;
};

export const ResultsPanel = ({
  comparison,
  summary,
  attempts,
  onPracticeAgain,
  onNewExercise,
}: ResultsPanelProps) => {
  const mismatches = comparison.lineComparisons
    .filter((line) => line.status === "incorrect")
    .slice(0, 8);

  return (
    <section className="results-layout">
      <div className="panel result-summary">
        <p className="eyebrow">Result</p>
        <h2>{comparison.completed ? "Completed" : "Needs review"}</h2>
        <div className="result-stats">
          {summary.showTimer && (
            <span>
              <strong>{formatDuration(summary.durationMs)}</strong>
              Time
            </span>
          )}
          <span>
            <strong>{summary.mismatchCount}</strong>
            Mismatched lines
          </span>
          <span>
            <strong>{formatModeLabel(summary.mode)}</strong>
            Mode
          </span>
        </div>

        <div className="action-row">
          <button type="button" className="primary-action compact" onClick={onPracticeAgain}>
            Practice Again
          </button>
          <button type="button" className="ghost-button" onClick={onNewExercise}>
            New Exercise
          </button>
        </div>
      </div>

      <div className="panel">
        <p className="eyebrow">Diff</p>
        <h2>First Mismatches</h2>
        {mismatches.length === 0 ? (
          <p className="muted">No mismatched lines.</p>
        ) : (
          <div className="diff-list">
            {mismatches.map((line) => (
              <div key={line.lineNumber} className="diff-item">
                <span className="line-badge">Line {line.lineNumber}</span>
                <div>
                  <small>Expected</small>
                  <pre>{line.expected || " "}</pre>
                </div>
                <div>
                  <small>Actual</small>
                  <pre>{line.actual || " "}</pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <p className="eyebrow">Session</p>
        <h2>Current Attempts</h2>
        {attempts.length === 0 ? (
          <p className="muted">No attempts yet.</p>
        ) : (
          <div className="attempt-table">
            {attempts.map((attempt) => (
              <div key={attempt.id} className="attempt-row">
                <span>{attempt.title || "Untitled"}</span>
                <span>{formatModeLabel(attempt.mode)}</span>
                <span>{attempt.showTimer ? formatDuration(attempt.durationMs) : "Hidden"}</span>
                <span>{attempt.mismatchCount} lines</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
