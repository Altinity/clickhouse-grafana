import * as monaco from "monaco-editor";
import { getAutocompletions } from "./autocompletions/functions";
import { getMacrosAutocompletion } from "./autocompletions/macros";
import keywords from "./constants/keywords";
import funcs from "./constants/funcs";
import dataTypes from "./constants/data-types";
import constants from "./constants/constants";
import macros from "./constants/macros";
import {IMarkdownString} from "monaco-editor";

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
  [monaco.languages.CompletionItemKind.Constant]: 'Constant',
  [monaco.languages.CompletionItemKind.TypeParameter]: 'Type',
  [monaco.languages.CompletionItemKind.Keyword]: 'Keyword',
  [monaco.languages.CompletionItemKind.Method]: 'Function',
  [monaco.languages.CompletionItemKind.Variable]: 'Macros',
}


const tokenize = () => {
    const keywordsImported = keywords;
    const functionsImported = funcs;
    const dataTypesImported = dataTypes;
    const constantsImported = constants;
    const macrosImported = macros;

    monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, {
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
    monaco.editor.defineTheme(THEME_NAME, {
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

const createCompletionItem = (label: string, kind: monaco.languages.CompletionItemKind, insertText: string, range: monaco.IRange, documentation?: string) => {
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
        } as IMarkdownString,
    }
};

const registerAutocompletion = (templateVariables) => {
    monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
        provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position);
            const range: monaco.IRange = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            const rangeMacros: monaco.IRange = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn - 1,
                endColumn: word.endColumn,
            };

            const mapToCompletionItems = (array: string[], kind: monaco.languages.CompletionItemKind) =>
                array.map(item => createCompletionItem(item, kind, item, range));

            const mapMacroToCompletionItems = (array: Array<{ name: string; def: string; docText: string }>, kind: monaco.languages.CompletionItemKind) =>
                array.map(item => createCompletionItem(item.name, kind, item.def, rangeMacros, item.docText));

            const mapFunctionToCompletionItems = (array: Array<{ name: string; def: string; docText: string }>, kind: monaco.languages.CompletionItemKind) =>
                array.map(item => createCompletionItem(item.name, kind, item.def, range, item.docText));


            const suggestConstants = mapToCompletionItems(constants, monaco.languages.CompletionItemKind.Constant);
            const suggestTypes = mapToCompletionItems(dataTypes, monaco.languages.CompletionItemKind.TypeParameter);
            const suggestKeywords = mapToCompletionItems(keywords, monaco.languages.CompletionItemKind.Keyword);
            const suggestionsFunctions = mapFunctionToCompletionItems(getAutocompletions(), monaco.languages.CompletionItemKind.Method);
            const suggestionsMacros = mapMacroToCompletionItems(getMacrosAutocompletion(), monaco.languages.CompletionItemKind.Variable);
            const suggestTemplateVariables = mapToCompletionItems(templateVariables.map((item: string) => `${item}`), monaco.languages.CompletionItemKind.Variable);

            return { incomplete: false, suggestions: [ ...suggestTemplateVariables, ...suggestionsFunctions, ...suggestionsMacros, ...suggestConstants, ...suggestKeywords, ...suggestTypes] };
        },
    });
};

export const initiateEditor = (templateVariables) => {
  // TODO: add use effect to databases autocompletion
  monaco.languages.register({ id: LANGUAGE_ID });
  tokenize();
  defineTheme();
  registerAutocompletion(templateVariables);


    return {theme: THEME_NAME, language: LANGUAGE_ID}
};
