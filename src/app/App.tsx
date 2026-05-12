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
const storageKey = "examprep-code-trainer-state-v1";
const maxStoredAttempts = 50;

type StoredAttemptSummary = Omit<PracticeAttemptSummary, "createdAt"> & {
  createdAt: string;
};

type StoredAppState = {
  title: string;
  language: Language;
  codeTheme: CodeTheme;
  referenceCode: string;
  mode: PracticeMode;
  strictness: Strictness;
  identifierMode: IdentifierMode;
  feedbackTiming: FeedbackTiming;
  showTimer: boolean;
  promptMask: PromptMaskConfig;
  skeleton: SkeletonConfig;
  missingPieces: MissingPiecesConfig;
  skeletonCode: string;
  skeletonEdited: boolean;
  attemptCode: string;
  startedAt: number | null;
  draftKey: string | null;
  attempts: StoredAttemptSummary[];
  theme: "light" | "dark";
};

type LegacyPracticeMode = PracticeMode | "exact";

type StoredAppStateWithLegacyMode = Omit<StoredAppState, "mode"> & {
  mode: LegacyPracticeMode;
};

type LegacyStoredAttemptSummary = Omit<StoredAttemptSummary, "mode"> & {
  mode: LegacyPracticeMode;
};

const readStoredState = (): Partial<StoredAppStateWithLegacyMode> => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawState = window.localStorage.getItem(storageKey);

    return rawState ? JSON.parse(rawState) : {};
  } catch {
    return {};
  }
};

const normalizeStoredMode = (mode: LegacyPracticeMode | undefined): PracticeMode => {
  if (mode === "exact") {
    return "exam";
  }

  return mode ?? "fog";
};

const hydrateAttempts = (
  attempts: LegacyStoredAttemptSummary[] | undefined,
): PracticeAttemptSummary[] => {
  if (!Array.isArray(attempts)) {
    return [];
  }

  return attempts.slice(0, maxStoredAttempts).map((attempt) => ({
    ...attempt,
    mode: normalizeStoredMode(attempt.mode),
    createdAt: new Date(attempt.createdAt),
  }));
};

export const App = () => {
  const [storedState] = useState(readStoredState);
  const [phase, setPhase] = useState<Phase>("setup");
  const [title, setTitle] = useState(storedState.title ?? "ft_strlen");
  const [language, setLanguage] = useState<Language>(storedState.language ?? "c");
  const [codeTheme, setCodeTheme] = useState<CodeTheme>(
    storedState.codeTheme ?? "vscode-dark",
  );
  const [referenceCode, setReferenceCode] = useState(
    storedState.referenceCode ?? sampleCode,
  );
  const [mode, setMode] = useState<PracticeMode>(
    normalizeStoredMode(storedState.mode),
  );
  const [strictness, setStrictness] = useState<Strictness>(
    storedState.strictness ?? "strict",
  );
  const [identifierMode, setIdentifierMode] = useState<IdentifierMode>(
    storedState.identifierMode ?? "exact",
  );
  const [feedbackTiming, setFeedbackTiming] = useState<FeedbackTiming>(
    storedState.feedbackTiming ?? "line",
  );
  const [showTimer, setShowTimer] = useState(storedState.showTimer ?? false);
  const [promptMask, setPromptMask] = useState<PromptMaskConfig>(
    storedState.promptMask ?? defaultPromptMask,
  );
  const [skeleton, setSkeleton] = useState<SkeletonConfig>(
    storedState.skeleton ?? defaultSkeleton,
  );
  const [missingPieces, setMissingPieces] =
    useState<MissingPiecesConfig>(storedState.missingPieces ?? defaultMissingPieces);
  const [skeletonCode, setSkeletonCode] = useState(() =>
    storedState.skeletonCode ??
    generateSkeleton(storedState.referenceCode ?? sampleCode, storedState.language ?? "c"),
  );
  const [skeletonEdited, setSkeletonEdited] = useState(
    storedState.skeletonEdited ?? false,
  );
  const [attemptCode, setAttemptCode] = useState(storedState.attemptCode ?? "");
  const [startedAt, setStartedAt] = useState<number | null>(
    storedState.startedAt ?? null,
  );
  const [draftKey, setDraftKey] = useState<string | null>(
    storedState.draftKey ?? null,
  );
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<PracticeAttemptSummary[]>(() =>
    hydrateAttempts(storedState.attempts),
  );
  const [lastSummary, setLastSummary] = useState<PracticeAttemptSummary | null>(null);
  const [now, setNow] = useState(Date.now());
  const [guideOpen, setGuideOpen] = useState(false);
  const [activeAttemptLine, setActiveAttemptLine] = useState(1);
  const [theme, setTheme] = useState<"light" | "dark">(
    storedState.theme ?? "dark",
  );

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
      mode === "reference"
        ? referenceCodeForPrompt
        : maskPromptCode(referenceCodeForPrompt, promptMask),
    [mode, promptMask, referenceCodeForPrompt],
  );

  const displayPromptCode = useMemo(
    () => (mode === "reference" ? promptCode : maskPromptCode(promptCode, promptMask)),
    [mode, promptCode, promptMask],
  );

  const previewCode = useMemo(() => {
    if (mode === "exam") {
      return "";
    }

    if (mode === "fog" || mode === "reference") {
      return displayReferenceCode;
    }

    return displayPromptCode;
  }, [displayPromptCode, displayReferenceCode, mode]);

  const effectiveFeedbackTiming: FeedbackTiming =
    mode === "exam" ? "submit" : feedbackTiming;

  const currentDraftKey = useMemo(
    () =>
      JSON.stringify({
        referenceCode,
        language,
        mode,
        strictness,
        identifierMode,
        feedbackTiming: effectiveFeedbackTiming,
        promptMask,
        skeleton,
        missingPieces,
        promptCode,
      }),
    [
      effectiveFeedbackTiming,
      identifierMode,
      language,
      missingPieces,
      mode,
      promptCode,
      promptMask,
      referenceCode,
      skeleton,
      strictness,
    ],
  );

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
    try {
      const stateToStore: StoredAppState = {
        title,
        language,
        codeTheme,
        referenceCode,
        mode,
        strictness,
        identifierMode,
        feedbackTiming,
        showTimer,
        promptMask,
        skeleton,
        missingPieces,
        skeletonCode,
        skeletonEdited,
        attemptCode: phase === "results" ? "" : attemptCode,
        startedAt: phase === "results" ? null : startedAt,
        draftKey: phase === "results" || !attemptCode ? null : draftKey,
        attempts: attempts.slice(0, maxStoredAttempts).map((attempt) => ({
          ...attempt,
          createdAt: attempt.createdAt.toISOString(),
        })),
        theme,
      };

      window.localStorage.setItem(storageKey, JSON.stringify(stateToStore));
    } catch {
      // Ignore storage failures such as private browsing quota limits.
    }
  }, [
    attempts,
    attemptCode,
    codeTheme,
    draftKey,
    feedbackTiming,
    identifierMode,
    language,
    missingPieces,
    mode,
    promptMask,
    referenceCode,
    showTimer,
    skeleton,
    skeletonCode,
    skeletonEdited,
    startedAt,
    strictness,
    theme,
    title,
    phase,
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
    setDraftKey(currentDraftKey);
    setStartedAt(Date.now());
    setFinishedAt(null);
    setNow(Date.now());
    setLastSummary(null);
    setActiveAttemptLine(1);
    setPhase("practice");
  };

  const continuePractice = () => {
    if (referenceHasComments || !attemptCode.trim() || draftKey !== currentDraftKey) {
      return;
    }

    setStartedAt((current) => current ?? Date.now());
    setFinishedAt(null);
    setNow(Date.now());
    setLastSummary(null);
    setActiveAttemptLine(1);
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
    setAttempts((current) => [summary, ...current].slice(0, maxStoredAttempts));
    setPhase("results");
  };

  const restartCurrent = () => {
    setAttemptCode(initialPracticeCode());
    setDraftKey(currentDraftKey);
    setStartedAt(Date.now());
    setFinishedAt(null);
    setNow(Date.now());
    setLastSummary(null);
    setActiveAttemptLine(1);
    setPhase("practice");
  };

  const resetToSetup = () => {
    setPhase("setup");
    setFinishedAt(null);
    setLastSummary(null);
  };

  const cancelPractice = () => {
    resetToSetup();
  };

  const clearDraft = () => {
    setAttemptCode("");
    setStartedAt(null);
    setDraftKey(null);
  };

  const startNewExercise = () => {
    clearDraft();
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
  const canContinue =
    canStart &&
    attemptCode.trim().length > 0 &&
    draftKey === currentDraftKey &&
    phase === "setup";

  const handleReferenceCodeChange = (value: string) => {
    const detectedLanguage = detectLanguage(value);

    if (detectedLanguage && detectedLanguage !== language) {
      setLanguage(detectedLanguage);
    }

    setReferenceCode(value);
    clearDraft();
    setSkeletonEdited(false);
  };

  const handleLanguageChange = (value: Language) => {
    setLanguage(value);
    clearDraft();
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
            onContinue={continuePractice}
            canStart={canStart}
            canContinue={canContinue}
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
            highlightedLineNumber={activeAttemptLine}
          />
          <PracticeEditor
            title={title}
            language={language}
            codeTheme={codeTheme}
            attemptCode={attemptCode}
            onAttemptCodeChange={setAttemptCode}
            onCursorLineChange={setActiveAttemptLine}
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
          onNewExercise={startNewExercise}
        />
      )}
    </main>
  );
};
