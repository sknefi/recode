import { useEffect, useRef } from "react";
import { indentLess, insertTab } from "@codemirror/commands";
import { cpp } from "@codemirror/lang-cpp";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import {
  type Extension,
  Prec,
  RangeSetBuilder,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  ViewUpdate,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { basicSetup } from "codemirror";
import type { CodeTheme, Language, LineStatus } from "../types/exercise";

type CodeEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  language: Language;
  codeTheme: CodeTheme;
  readOnly?: boolean;
  className?: string;
  lineStatuses?: Array<{ lineNumber: number; status: LineStatus }>;
  ariaLabel: string;
};

const setLineDecorations = StateEffect.define<DecorationSet>();

const lineDecorationField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, transaction) {
    let nextDecorations = decorations.map(transaction.changes);

    for (const effect of transaction.effects) {
      if (effect.is(setLineDecorations)) {
        nextDecorations = effect.value;
      }
    }

    return nextDecorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

const languageExtension = (language: Language): Extension[] => {
  if (language === "c") {
    return [cpp()];
  }

  if (language === "python") {
    return [python()];
  }

  return [];
};

const codeThemeColors: Record<
  CodeTheme,
  {
    keyword: string;
    controlKeyword: string;
    string: string;
    comment: string;
    number: string;
    function: string;
    type: string;
    variable: string;
    constant: string;
    escape: string;
    operator: string;
    background: string;
    foreground: string;
    gutter: string;
    activeLine: string;
    selection: string;
  }
> = {
  classic: {
    keyword: "#7c3aed",
    controlKeyword: "#7c3aed",
    string: "#0f766e",
    comment: "#6b7280",
    number: "#b45309",
    function: "#2563eb",
    type: "#be123c",
    variable: "#334155",
    constant: "#2563eb",
    escape: "#b45309",
    operator: "#64748b",
    background: "#fffaf1",
    foreground: "#27231f",
    gutter: "#f4f1ea",
    activeLine: "#f9f4e8",
    selection: "#c7ddd9",
  },
  "vscode-dark": {
    keyword: "#569cd6",
    controlKeyword: "#c586c0",
    string: "#ce9178",
    comment: "#6a9955",
    number: "#b5cea8",
    function: "#dcdcaa",
    type: "#4ec9b0",
    variable: "#9cdcfe",
    constant: "#4fc1ff",
    escape: "#d7ba7d",
    operator: "#d4d4d4",
    background: "#1e1e1e",
    foreground: "#d4d4d4",
    gutter: "#252526",
    activeLine: "#2a2d2e",
    selection: "#264f78",
  },
  "vscode-light": {
    keyword: "#0000ff",
    controlKeyword: "#af00db",
    string: "#a31515",
    comment: "#008000",
    number: "#098658",
    function: "#795e26",
    type: "#267f99",
    variable: "#001080",
    constant: "#0070c1",
    escape: "#ee0000",
    operator: "#000000",
    background: "#ffffff",
    foreground: "#1f1f1f",
    gutter: "#f3f3f3",
    activeLine: "#f7f7f7",
    selection: "#add6ff",
  },
  "github-dark": {
    keyword: "#ff7b72",
    controlKeyword: "#ff7b72",
    string: "#a5d6ff",
    comment: "#8b949e",
    number: "#79c0ff",
    function: "#d2a8ff",
    type: "#ffa657",
    variable: "#c9d1d9",
    constant: "#79c0ff",
    escape: "#79c0ff",
    operator: "#ff7b72",
    background: "#0d1117",
    foreground: "#c9d1d9",
    gutter: "#161b22",
    activeLine: "#161b22",
    selection: "#264f78",
  },
  monokai: {
    keyword: "#f92672",
    controlKeyword: "#f92672",
    string: "#e6db74",
    comment: "#75715e",
    number: "#ae81ff",
    function: "#a6e22e",
    type: "#66d9ef",
    variable: "#f8f8f2",
    constant: "#ae81ff",
    escape: "#ae81ff",
    operator: "#f92672",
    background: "#272822",
    foreground: "#f8f8f2",
    gutter: "#2f3029",
    activeLine: "#3e3d32",
    selection: "#49483e",
  },
  dracula: {
    keyword: "#ff79c6",
    controlKeyword: "#ff79c6",
    string: "#f1fa8c",
    comment: "#6272a4",
    number: "#bd93f9",
    function: "#50fa7b",
    type: "#8be9fd",
    variable: "#f8f8f2",
    constant: "#bd93f9",
    escape: "#ffb86c",
    operator: "#ff79c6",
    background: "#282a36",
    foreground: "#f8f8f2",
    gutter: "#21222c",
    activeLine: "#343746",
    selection: "#44475a",
  },
  neon: {
    keyword: "#ff2e88",
    controlKeyword: "#ff2e88",
    string: "#00c2a8",
    comment: "#8a91a8",
    number: "#ff9f1c",
    function: "#00a6ff",
    type: "#b967ff",
    variable: "#e7f6ff",
    constant: "#00e5ff",
    escape: "#ffe66d",
    operator: "#ffe66d",
    background: "#080a12",
    foreground: "#e7f6ff",
    gutter: "#101427",
    activeLine: "#151a31",
    selection: "#26345d",
  },
};

const codeThemeExtension = (theme: CodeTheme) => {
  const colors = codeThemeColors[theme];

  return [
    Prec.highest(
      syntaxHighlighting(
        HighlightStyle.define([
          { tag: tags.keyword, color: colors.keyword, fontWeight: "700" },
          { tag: tags.controlKeyword, color: colors.controlKeyword },
          { tag: [tags.operatorKeyword, tags.definitionKeyword, tags.moduleKeyword, tags.modifier], color: colors.keyword },
          { tag: [tags.string, tags.character], color: colors.string },
          { tag: [tags.escape, tags.special(tags.string)], color: colors.escape },
          { tag: tags.comment, color: colors.comment, fontStyle: "italic" },
          { tag: [tags.number, tags.integer, tags.float], color: colors.number },
          { tag: [tags.constant(tags.variableName), tags.macroName], color: colors.constant },
          {
            tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
            color: colors.function,
          },
          {
            tag: [tags.typeName, tags.className, tags.standard(tags.typeName)],
            color: colors.type,
          },
          { tag: [tags.variableName, tags.propertyName], color: colors.variable },
          { tag: [tags.operator, tags.punctuation], color: colors.operator },
        ]),
      ),
    ),
    EditorView.theme({
      "&": {
        backgroundColor: colors.background,
        color: colors.foreground,
      },
      ".cm-content": {
        caretColor: colors.foreground,
      },
      ".cm-gutters": {
        backgroundColor: colors.gutter,
        color: colors.comment,
        borderRightColor: colors.gutter,
      },
      ".cm-activeLine": {
        backgroundColor: colors.activeLine,
      },
      ".cm-activeLineGutter": {
        backgroundColor: colors.activeLine,
      },
      ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: colors.selection,
      },
      ".cm-cursor": {
        borderLeftColor: colors.foreground,
      },
    }),
  ];
};

export const CodeEditor = ({
  value,
  onChange,
  language,
  codeTheme,
  readOnly = false,
  className = "",
  lineStatuses = [],
  ariaLabel,
}: CodeEditorProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!hostRef.current) {
      return undefined;
    }

    const updateListener = EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged && onChangeRef.current) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const view = new EditorView({
      doc: value,
      parent: hostRef.current,
      extensions: [
        basicSetup,
        keymap.of([
          { key: "Tab", run: insertTab },
          { key: "Shift-Tab", run: indentLess },
        ]),
        EditorView.lineWrapping,
        EditorView.editable.of(!readOnly),
        EditorView.theme({
          "&": {
            minHeight: "100%",
            fontSize: "14px",
          },
          ".cm-content": {
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
            padding: "14px 0",
          },
          ".cm-line": {
            padding: "0 14px",
          },
          "&.cm-focused": {
            outline: "none",
          },
        }),
        lineDecorationField,
        codeThemeExtension(codeTheme),
        updateListener,
        ...languageExtension(language),
      ],
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [codeTheme, language, readOnly]);

  useEffect(() => {
    const view = viewRef.current;

    if (!view || view.state.doc.toString() === value) {
      return;
    }

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: value,
      },
    });
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;

    if (!view) {
      return;
    }

    const builder = new RangeSetBuilder<Decoration>();

    for (const line of lineStatuses) {
      if (line.status === "pending" || line.lineNumber > view.state.doc.lines) {
        continue;
      }

      const docLine = view.state.doc.line(line.lineNumber);
      builder.add(
        docLine.from,
        docLine.from,
        Decoration.line({ class: `cm-line-${line.status}` }),
      );
    }

    view.dispatch({
      effects: setLineDecorations.of(builder.finish()),
    });
  }, [lineStatuses]);

  return (
    <div
      ref={hostRef}
      className={`code-editor ${className}`}
      aria-label={ariaLabel}
    />
  );
};
