import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Moon, Sun } from "lucide-react";
import { hasComments } from "../lib/comments";
import {
  compareAttempt,
  getLineStatuses,
  getVisibleMismatchCount,
  type AttemptComparison,
} from "../lib/compare";
import { formatModeLabel } from "../lib/format";
import { detectLanguage } from "../lib/languageDetect";
import { generateMissingPieces } from "../lib/missingPieces";
import { maskPromptCode } from "../lib/promptMask";
import {
  applySkeletonOptions,
  ensureSkeletonMatchesReferenceShell,
  generateSkeleton,
} from "../lib/skeleton";
import type {
  CodeTheme,
  FeedbackTiming,
  IdentifierMode,
  Language,
  MissingPiecesConfig,
  PromptMaskConfig,
  PracticeAttemptSummary,
  PracticeMode,
  SkeletonConfig,
  Strictness,
} from "../types/exercise";
import { PracticeEditor } from "../components/PracticeEditor";
import { PracticeSetup } from "../components/PracticeSetup";
import { ReferenceInput } from "../components/ReferenceInput";
import { ReferencePanel } from "../components/ReferencePanel";
import { ResultsPanel } from "../components/ResultsPanel";
import { GuideDialog } from "../components/GuideDialog";

const sampleCode = `int ft_strlen(char *str)
{
    int i;

    i = 0;
    while (str[i] != '\\0')
        i++;
    return (i);
}`;

const defaultMissingPieces: MissingPiecesConfig = {
  strategy: "pattern",
  patterns: ["while", "return"],
  everyNth: 3,
  manualLines: "",
};

const defaultPromptMask: PromptMaskConfig = {
  hideNames: false,
  hideValues: false,
};

const defaultSkeleton: SkeletonConfig = {
  includeImports: true,
};

const createAttemptId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

type Phase = "setup" | "practice" | "results";

const appHistoryState = { app: "examprep-code-trainer" };

export const App = () => {
  const [phase, setPhase] = useState<Phase>("setup");
  const [title, setTitle] = useState("ft_strlen");
  const [language, setLanguage] = useState<Language>("c");
  const [codeTheme, setCodeTheme] = useState<CodeTheme>("vscode-dark");
  const [referenceCode, setReferenceCode] = useState(sampleCode);
  const [mode, setMode] = useState<PracticeMode>("fog");
  const [strictness, setStrictness] = useState<Strictness>("strict");
  const [identifierMode, setIdentifierMode] = useState<IdentifierMode>("exact");
  const [feedbackTiming, setFeedbackTiming] = useState<FeedbackTiming>("line");
  const [showTimer, setShowTimer] = useState(false);
  const [promptMask, setPromptMask] = useState<PromptMaskConfig>(defaultPromptMask);
  const [skeleton, setSkeleton] = useState<SkeletonConfig>(defaultSkeleton);
  const [missingPieces, setMissingPieces] =
    useState<MissingPiecesConfig>(defaultMissingPieces);
  const [skeletonCode, setSkeletonCode] = useState(() =>
    generateSkeleton(sampleCode, "c"),
  );
  const [skeletonEdited, setSkeletonEdited] = useState(false);
  const [attemptCode, setAttemptCode] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<PracticeAttemptSummary[]>([]);
  const [lastSummary, setLastSummary] = useState<PracticeAttemptSummary | null>(null);
  const [now, setNow] = useState(Date.now());
  const [guideOpen, setGuideOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const generatedSkeletonCode = useMemo(
    () => generateSkeleton(referenceCode, language),
    [language, referenceCode],
  );

  const effectiveSkeletonCode = applySkeletonOptions(
    skeletonEdited ? skeletonCode : generatedSkeletonCode,
    language,
    skeleton.includeImports,
  );

  const referenceCodeForPrompt = referenceCode;

  const missingPiecesPreview = useMemo(
    () => generateMissingPieces(referenceCodeForPrompt, missingPieces),
    [referenceCodeForPrompt, missingPieces],
  );

  const promptCode = useMemo(() => {
    if (mode === "missing-pieces") {
      return missingPiecesPreview.template;
    }

    if (mode === "skeleton") {
      return ensureSkeletonMatchesReferenceShell(
        effectiveSkeletonCode,
        referenceCodeForPrompt,
        language,
      );
    }

    return referenceCodeForPrompt;
  }, [
    effectiveSkeletonCode,
    language,
    mode,
    missingPiecesPreview.template,
    referenceCodeForPrompt,
  ]);

  const displayReferenceCode = useMemo(
    () =>
      mode === "exact"
        ? referenceCodeForPrompt
        : maskPromptCode(referenceCodeForPrompt, promptMask),
    [mode, promptMask, referenceCodeForPrompt],
  );

  const displayPromptCode = useMemo(
    () => (mode === "exact" ? promptCode : maskPromptCode(promptCode, promptMask)),
    [mode, promptCode, promptMask],
  );

  const previewCode = useMemo(() => {
    if (mode === "exact" || mode === "exam") {
      return "";
    }

    if (mode === "fog") {
      return displayReferenceCode;
    }

    return displayPromptCode;
  }, [displayPromptCode, displayReferenceCode, mode]);

  const effectiveFeedbackTiming: FeedbackTiming =
    mode === "exam" ? "submit" : feedbackTiming;

  const elapsedMs = startedAt ? (finishedAt ?? now) - startedAt : 0;

  const lineStatuses = useMemo(
    () =>
      getLineStatuses(
        referenceCode,
        attemptCode,
        strictness,
        effectiveFeedbackTiming,
        phase === "results",
        language,
        "require",
        identifierMode,
      ),
    [
      attemptCode,
      effectiveFeedbackTiming,
      identifierMode,
      language,
      phase,
      referenceCode,
      strictness,
    ],
  );

  const visibleMismatchCount = useMemo(
    () => getVisibleMismatchCount(lineStatuses),
    [lineStatuses],
  );

  const finalComparison: AttemptComparison | null = useMemo(() => {
    if (phase !== "results") {
      return null;
    }

    return compareAttempt(
      referenceCode,
      attemptCode,
      strictness,
      language,
      "require",
      identifierMode,
    );
  }, [
    attemptCode,
    identifierMode,
    language,
    phase,
    referenceCode,
    strictness,
  ]);

  useEffect(() => {
    if (phase !== "practice") {
      return undefined;
    }

    const intervalId = window.setInterval(() => setNow(Date.now()), 250);

    return () => window.clearInterval(intervalId);
  }, [phase]);

  useEffect(() => {
    if (!guideOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setGuideOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [guideOpen]);

  useEffect(() => {
    const handlePopState = () => {
      setAttemptCode("");
      resetToSetup();
    };

    window.history.replaceState(appHistoryState, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (phase === "setup") {
      return;
    }

    if (window.history.state?.phase === phase) {
      return;
    }

    window.history.pushState({ ...appHistoryState, phase }, "", window.location.href);
  }, [phase]);

  useEffect(() => {
    if (!skeletonEdited) {
      setSkeletonCode(generatedSkeletonCode);
    }
  }, [generatedSkeletonCode, skeletonEdited]);

  useEffect(() => {
    if (language === "python") {
      return;
    }

    const cPatterns = new Set(["include", "return", "if", "else", "while", "for"]);
    setMissingPieces((current) => ({
      ...current,
      patterns: current.patterns.filter((pattern) => cPatterns.has(pattern)),
    }));
  }, [language]);

  useEffect(() => {
    if (mode === "skeleton") {
      setSkeletonEdited(false);
    }
  }, [language, mode, referenceCode]);

  const initialPracticeCode = () => {
    if (mode === "missing-pieces" || mode === "skeleton") {
      return displayPromptCode;
    }

    return "";
  };

  const startPractice = () => {
    if (referenceHasComments) {
      return;
    }

    setAttemptCode(initialPracticeCode());
    setStartedAt(Date.now());
    setFinishedAt(null);
    setNow(Date.now());
    setLastSummary(null);
    setPhase("practice");
  };

  const submitAttempt = () => {
    const completedAt = Date.now();
    const comparison = compareAttempt(
      referenceCode,
      attemptCode,
      strictness,
      language,
      "require",
      identifierMode,
    );
    const summary: PracticeAttemptSummary = {
      id: createAttemptId(),
      title,
      mode,
      strictness,
      identifierMode,
      feedbackTiming: effectiveFeedbackTiming,
      showTimer,
      durationMs: startedAt ? completedAt - startedAt : 0,
      mismatchCount: comparison.mismatchCount,
      completed: comparison.completed,
      createdAt: new Date(completedAt),
    };

    setFinishedAt(completedAt);
    setLastSummary(summary);
    setAttempts((current) => [summary, ...current]);
    setPhase("results");
  };

  const restartCurrent = () => {
    setAttemptCode(initialPracticeCode());
    setStartedAt(Date.now());
    setFinishedAt(null);
    setNow(Date.now());
    setLastSummary(null);
    setPhase("practice");
  };

  const resetToSetup = () => {
    setPhase("setup");
    setFinishedAt(null);
    setStartedAt(null);
    setLastSummary(null);
  };

  const cancelPractice = () => {
    setAttemptCode("");
    resetToSetup();
  };

  const regenerateSkeleton = () => {
    setSkeletonCode(generatedSkeletonCode);
    setSkeletonEdited(false);
  };

  const updateSkeletonCode = (value: string) => {
    setSkeletonCode(value);
    setSkeletonEdited(true);
  };

  const updateSkeleton = (value: SkeletonConfig) => {
    setSkeleton(value);
    setSkeletonEdited(false);
  };

  const referenceHasComments = useMemo(
    () => hasComments(referenceCode, language),
    [language, referenceCode],
  );
  const referenceValidationMessage = referenceHasComments
    ? "Remove comments before starting. Comments are not allowed in reference code."
    : "";
  const canStart = referenceCode.trim().length > 0 && !referenceHasComments;

  const handleReferenceCodeChange = (value: string) => {
    const detectedLanguage = detectLanguage(value);

    if (detectedLanguage && detectedLanguage !== language) {
      setLanguage(detectedLanguage);
    }

    setReferenceCode(value);
    setSkeletonEdited(false);
  };

  const handleLanguageChange = (value: Language) => {
    setLanguage(value);
    setSkeletonEdited(false);
  };

  const handleModeChange = (value: PracticeMode) => {
    setMode(value);

    if (value === "skeleton") {
      setSkeletonEdited(false);
    }
  };

  return (
    <main className="app-shell" data-theme={theme}>
      <header className="app-header">
        <div className="header-title">
          {phase !== "setup" && (
            <button
              type="button"
              className="top-back-button"
              onClick={resetToSetup}
              aria-label="Back to setup"
            >
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
          )}
          <div>
            <p className="eyebrow">ExamPrep Code Trainer</p>
            <div className="title-row">
              <h1>Practice code from memory</h1>
              <button
                type="button"
                className="guide-button prominent"
                onClick={() => setGuideOpen(true)}
              >
                <BookOpen size={17} aria-hidden="true" />
                Guide
              </button>
            </div>
          </div>
        </div>
        <div className="header-meta">
          <button
            type="button"
            className="theme-button"
            onClick={() =>
              setTheme((current) => (current === "light" ? "dark" : "light"))
            }
            aria-label={
              theme === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
          >
            {theme === "light" ? (
              <Moon size={16} aria-hidden="true" />
            ) : (
              <Sun size={16} aria-hidden="true" />
            )}
            {theme === "light" ? "Dark" : "Light"}
          </button>
          <span>{formatModeLabel(mode)}</span>
          <span>{strictness === "strict" ? "Strict" : "Whitespace tolerant"}</span>
          <span>{identifierMode === "exact" ? "Exact names" : "Flexible names"}</span>
          <span>{formatModeLabel(effectiveFeedbackTiming)}</span>
        </div>
      </header>

      <GuideDialog open={guideOpen} onClose={() => setGuideOpen(false)} />

      {phase === "setup" && (
        <div className="setup-layout">
          <ReferenceInput
            title={title}
            onTitleChange={setTitle}
            language={language}
            onLanguageChange={handleLanguageChange}
            codeTheme={codeTheme}
            referenceCode={referenceCode}
            onReferenceCodeChange={handleReferenceCodeChange}
            validationMessage={referenceValidationMessage}
          />
          <PracticeSetup
            mode={mode}
            onModeChange={handleModeChange}
            language={language}
            codeTheme={codeTheme}
            onCodeThemeChange={setCodeTheme}
            strictness={strictness}
            onStrictnessChange={setStrictness}
            identifierMode={identifierMode}
            onIdentifierModeChange={setIdentifierMode}
            feedbackTiming={feedbackTiming}
            onFeedbackTimingChange={setFeedbackTiming}
            showTimer={showTimer}
            onShowTimerChange={setShowTimer}
            promptMask={promptMask}
            onPromptMaskChange={setPromptMask}
            skeleton={skeleton}
            onSkeletonChange={updateSkeleton}
            missingPieces={missingPieces}
            onMissingPiecesChange={setMissingPieces}
            blankedLines={missingPiecesPreview.blankedLines}
            skeletonCode={effectiveSkeletonCode}
            onSkeletonCodeChange={updateSkeletonCode}
            onRegenerateSkeleton={regenerateSkeleton}
            previewCode={previewCode}
            onStart={startPractice}
            canStart={canStart}
          />
        </div>
      )}

      {phase === "practice" && (
        <div className="practice-layout">
          <ReferencePanel
            mode={mode}
            language={language}
            codeTheme={codeTheme}
            displayReferenceCode={displayReferenceCode}
            displayPromptCode={displayPromptCode}
          />
          <PracticeEditor
            title={title}
            language={language}
            codeTheme={codeTheme}
            attemptCode={attemptCode}
            onAttemptCodeChange={setAttemptCode}
            lineStatuses={lineStatuses}
            elapsedMs={elapsedMs}
            showTimer={showTimer}
            visibleMismatchCount={visibleMismatchCount}
            onSubmit={submitAttempt}
            onRestart={restartCurrent}
            onBack={cancelPractice}
          />
        </div>
      )}

      {phase === "results" && finalComparison && lastSummary && (
        <ResultsPanel
          comparison={finalComparison}
          summary={lastSummary}
          attempts={attempts}
          onPracticeAgain={restartCurrent}
          onNewExercise={resetToSetup}
        />
      )}
    </main>
  );
};
