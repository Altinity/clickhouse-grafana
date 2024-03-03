import { getAutocompletions } from "./autocompletions/functions";
import { getMacrosAutocompletion } from "./autocompletions/macros";
import keywords from "./constants/keywords";
import funcs from "./constants/funcs";
import dataTypes from "./constants/data-types";
import constants from "./constants/constants";
import macros from "./constants/macros";

enum TokenType {
    FUNCTIONS = "custom-functions",
    KEYWORDS = "custom-keywords",
    CONSTANTS = "custom-constants",
    DATATYPES = "custom-datatypes",
    MACROS = "custom-macros",
    PARENTHESIS = "custom-parenthesis",
    COMMENT = "custom-comment",
    COMMENT_BLOCK = "custom-comment-block",
    VARIABLE = "custom-variable",
    STRING = "custom-string"
}

export const THEME_NAME = "clickhouse-dark-theme";
export const LANGUAGE_ID = "clickhouseLanguage";

export const initiateEditor = (templateVariables: any, monacoInstance: any) => {

  if (!monacoInstance) {
    return;
  }

  const Colors = {
    FUNCTIONS: "#66d9ef",      // Gold for functions
    KEYWORDS: "#66d9ef",     // Spring green for keywords
    CONSTANTS: "#fe85fc",      // Sky blue for constants
    DATATYPES: "#66d9ef",      // Tomato for data types
    MACROS: "#a6e22e",         // Gold for macros (similar to functions for consistency)
    PARENTHESIS: "#f0a842",    // Slate blue for parentheses
    COMMENTS: "#75715e",        // Dark gray for comments,
    COMMENT_BLOCK: "#75715e",        // Dark gray for comments,
    VARIABLE: "#75715e",        // Dark gray for comments,
    STRING: "#74e680"
  };

  const Types = {
    [monacoInstance.languages.CompletionItemKind.Constant]: 'Constant',
    [monacoInstance.languages.CompletionItemKind.TypeParameter]: 'Type',
    [monacoInstance.languages.CompletionItemKind.Keyword]: 'Keyword',
    [monacoInstance.languages.CompletionItemKind.Method]: 'Function',
    [monacoInstance.languages.CompletionItemKind.Variable]: 'Macros',
  }


  const tokenize = () => {
    const keywordsImported = keywords;
    const functionsImported = funcs;
    const dataTypesImported = dataTypes;
    const constantsImported = constants;
    const macrosImported = macros;

    monacoInstance.languages.setMonarchTokensProvider(LANGUAGE_ID, {
      tokenizer: {
        root: [
          [new RegExp(`\\b(${keywordsImported.join('|')})\\b`), TokenType.KEYWORDS],
          [new RegExp(`\\s(${functionsImported.join('|')})`), TokenType.FUNCTIONS],
          [new RegExp(`[()]`), TokenType.PARENTHESIS],
          [new RegExp(`--.*$`), TokenType.COMMENT],
          [new RegExp(`\`\`\`.*\`\`\``), TokenType.COMMENT_BLOCK],
          [new RegExp(`\\$\\w+`), TokenType.VARIABLE],
          [new RegExp(`\\$\{\\w+\}`), TokenType.VARIABLE],
          [new RegExp(`'.*?'`), TokenType.STRING],
          [new RegExp(`\\b(${dataTypesImported.join('|')})\\b`), TokenType.DATATYPES],
          [new RegExp(`\\b(${constantsImported.join('|')})\\b`), TokenType.CONSTANTS],
          [new RegExp(`(${macrosImported.map(macros => macros.replace('$','\\$')).join('|')})`), TokenType.MACROS],
        ],
      },
    });
  };

  const defineTheme = () => {
    monacoInstance.editor.defineTheme(THEME_NAME, {
      base: "vs-dark",
      inherit: false,
      rules: [
        { token: TokenType.FUNCTIONS, foreground: Colors.FUNCTIONS },
        { token: TokenType.PARENTHESIS, foreground: Colors.PARENTHESIS },
        { token: TokenType.KEYWORDS, foreground: Colors.KEYWORDS },
        { token: TokenType.CONSTANTS, foreground: Colors.CONSTANTS },
        { token: TokenType.DATATYPES, foreground: Colors.DATATYPES },
        { token: TokenType.MACROS, foreground: Colors.MACROS },
        { token: TokenType.COMMENT, foreground: Colors.COMMENTS },
        { token: TokenType.COMMENT_BLOCK, foreground: Colors.COMMENT_BLOCK },
        { token: TokenType.VARIABLE, foreground: Colors.MACROS },
        { token: TokenType.STRING, foreground: Colors.STRING },
      ],
      colors: {
        "editor.foreground": "#e0e0e0",
        "editor.background": "#000000",
      },
    });
  };

  // @ts-ignore
  const createCompletionItem = (label: string, kind: monacoInstance.languages.CompletionItemKind, insertText: string, range: monacoInstance.IRange, documentation?: string) => {
    return {
      label: {
        label,
        description: Types[kind]
      },
      kind,
      insertText,
      range,
      documentation: {
        value: documentation,
      } as any,
    }
  };

  const registerAutocompletion = (templateVariables) => {
    monacoInstance.languages.registerCompletionItemProvider(LANGUAGE_ID, {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        // @ts-ignore
        const range: monacoInstance.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        // @ts-ignore
        const rangeMacros: monacoInstance.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn - 1,
          endColumn: word.endColumn,
        };
        // @ts-ignore
        const mapToCompletionItems = (array: string[], kind: monacoInstance.languages.CompletionItemKind) =>
          array.map(item => createCompletionItem(item, kind, item, range));
        // @ts-ignore
        const mapMacroToCompletionItems = (array: Array<{ name: string; def: string; docText: string }>, kind: monacoInstance.languages.CompletionItemKind) =>
          array.map(item => createCompletionItem(item.name, kind, item.def, rangeMacros, item.docText));
        // @ts-ignore
        const mapFunctionToCompletionItems = (array: Array<{ name: string; def: string; docText: string }>, kind: monacoInstance.languages.CompletionItemKind) =>
          array.map(item => createCompletionItem(item.name, kind, item.def, range, item.docText));

        // @ts-ignore
        const suggestConstants = mapToCompletionItems(constants, monacoInstance.languages.CompletionItemKind.Constant);
        // @ts-ignore
        const suggestTypes = mapToCompletionItems(dataTypes, monacoInstance.languages.CompletionItemKind.TypeParameter);
        // @ts-ignore
        const suggestKeywords = mapToCompletionItems(keywords, monacoInstance.languages.CompletionItemKind.Keyword);
        // @ts-ignore
        const suggestionsFunctions = mapFunctionToCompletionItems(getAutocompletions(), monacoInstance.languages.CompletionItemKind.Method);

        // @ts-ignore
        const suggestionsMacros = mapMacroToCompletionItems(getMacrosAutocompletion(), monacoInstance.languages.CompletionItemKind.Variable);
        // @ts-ignore
        const suggestTemplateVariables = mapToCompletionItems(templateVariables.map((item: string) => `${item}`), monacoInstance.languages.CompletionItemKind.Variable);

        return { incomplete: false, suggestions: [ ...suggestTemplateVariables, ...suggestionsFunctions, ...suggestionsMacros, ...suggestConstants, ...suggestKeywords, ...suggestTypes] };
      },
    });
  };

  // TODO: add use effect to databases autocompletion
  monacoInstance.languages.register({ id: LANGUAGE_ID });
  tokenize();
  defineTheme();
  registerAutocompletion(templateVariables);

  return {theme: THEME_NAME, language: LANGUAGE_ID}
};
