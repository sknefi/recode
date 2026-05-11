export type PracticeMode = "exact" | "fog" | "missing-pieces" | "skeleton" | "exam";

export type Strictness = "strict" | "whitespace-tolerant";

export type IdentifierMode = "exact" | "flexible";

export type FeedbackTiming = "instant" | "line" | "submit";

export type Language = "c" | "python";

export type CodeTheme =
  | "classic"
  | "vscode-dark"
  | "vscode-light"
  | "github-dark"
  | "monokai"
  | "dracula"
  | "neon";

export type CommentBehavior = "require" | "ignore" | "hide";

export type MissingPiecesStrategy = "pattern" | "every-nth" | "manual";

export type MissingPiecePattern =
  | "return"
  | "if"
  | "elif"
  | "else"
  | "while"
  | "for"
  | "include"
  | "import"
  | "try"
  | "except"
  | "with"
  | "def";

export type MissingPiecesConfig = {
  strategy: MissingPiecesStrategy;
  patterns: MissingPiecePattern[];
  everyNth: number;
  manualLines: string;
};

export type PromptMaskConfig = {
  hideNames: boolean;
  hideValues: boolean;
};

export type SkeletonConfig = {
  includeImports: boolean;
};

export type PracticeConfig = {
  mode: PracticeMode;
  strictness: Strictness;
  identifierMode: IdentifierMode;
  feedbackTiming: FeedbackTiming;
  missingPieces: MissingPiecesConfig;
  promptMask: PromptMaskConfig;
  skeleton: SkeletonConfig;
  skeletonCode: string;
};

export type PracticeAttemptSummary = {
  id: string;
  title: string;
  mode: PracticeMode;
  strictness: Strictness;
  identifierMode: IdentifierMode;
  feedbackTiming: FeedbackTiming;
  showTimer: boolean;
  durationMs: number;
  mismatchCount: number;
  completed: boolean;
  createdAt: Date;
};

export type LineStatus = "pending" | "correct" | "incorrect";
