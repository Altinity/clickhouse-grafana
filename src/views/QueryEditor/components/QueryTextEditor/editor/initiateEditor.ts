import {getAutocompletions} from "./autocompletions/functions";
import {getMacrosAutocompletion} from "./autocompletions/macros";
import keywords from "./constants/keywords";
import funcs from "./constants/funcs";
import dataTypes from "./constants/data-types";
import constants from "./constants/constants";
import macros from "./constants/macros";

declare global {
  interface Window {
    monacoInstance: any; // Replace 'any' with the desired type of your 'test' property
  }
}
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

export const initiateEditor = (templateVariables: any, monacoInstance: any, autocompletionData: any, systemDatabasesData: any) => {
	const {Method, Variable, Constant, Keyword, TypeParameter, Text} = monacoInstance.languages.CompletionItemKind


	let dynamicIdentifier: string[]
	let dynamicKeyword: string[]
	let dynamicString: string[]
	let dynamicSystemDatabases: string[];

	if (autocompletionData) {
		dynamicIdentifier = autocompletionData?.identifier || [];
		dynamicKeyword = autocompletionData?.keyword || [];
		dynamicString = autocompletionData?.string || [];
	}

	if (systemDatabasesData) {
		dynamicSystemDatabases = systemDatabasesData || []
	}

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
		[Constant]: 'Constant',
		[TypeParameter]: 'Type',
		[Keyword]: 'Keyword',
		[Method]: 'Function',
		[Variable]: 'Macros',
		[Text]: 'Macros',
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
					[new RegExp(`\\b(${[...keywordsImported,
						...dynamicKeyword,
						...dynamicSystemDatabases].join('|')})\\b`),
					TokenType.KEYWORDS],
					[new RegExp(`\\s(${functionsImported.join('|')})`),
						TokenType.FUNCTIONS],
					[new RegExp(`[()]`),
						TokenType.PARENTHESIS],
					[new RegExp(`--.*$`),
						TokenType.COMMENT],
					[new RegExp(`\`\`\`.*\`\`\``),
						TokenType.COMMENT_BLOCK],
					[new RegExp(`\\$\\w+`),
						TokenType.VARIABLE],
					[new RegExp(`\\$\{\\w+\}`),
						TokenType.VARIABLE],
					[new RegExp(`'.*?'`),
						TokenType.STRING],
					[new RegExp(`\\b(${dataTypesImported.join('|')})\\b`),
						TokenType.DATATYPES],
					[new RegExp(`\\b(${constantsImported.join('|')})\\b`),
						TokenType.CONSTANTS],
					[new RegExp(`(${macrosImported.map(macros => macros.replace('$','\\$')).join('|')})`),
						TokenType.MACROS],
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
	const createCompletionItem = (label: string, kind: monacoInstance.languages.CompletionItemKind, insertText: string, range: any, documentation?: string) => {
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

	const registerAutocompletion = (templateVariables, monacoInstance) => {
		monacoInstance.languages.registerCompletionItemProvider(LANGUAGE_ID, {
			provideCompletionItems: (model, position) => {
				const word = model.getWordUntilPosition(position);

				const range: any = {
					startLineNumber: position.lineNumber,
					endLineNumber: position.lineNumber,
					startColumn: word.startColumn,
					endColumn: word.endColumn,
				};

				const rangeMacros: any = {
					...range,
					startColumn: word.startColumn - 1,
				};

        // @ts-ignore
        type CompletionItemKind = monacoInstance.languages.CompletionItemKind

				const mapToCompletionItems = (array: string[], kind: CompletionItemKind) =>
					array.map(item => createCompletionItem(item, kind, item, range));
				const mapMacroToCompletionItems = (array: Array<{ name: string; def: string; docText: string }>, kind: CompletionItemKind) =>
					array.map(item => createCompletionItem(item.name, kind, item.def, rangeMacros, item.docText));
				const mapFunctionToCompletionItems = (array: Array<{ name: string; def: string; docText: string }>, kind: CompletionItemKind) =>
					array.map(item => createCompletionItem(item.name, kind, item.def, range, item.docText));
        
        
				return {
					incomplete: false, 
					suggestions: [
						...mapFunctionToCompletionItems(getAutocompletions(), Method),
						...mapMacroToCompletionItems(getMacrosAutocompletion(), Variable),
						...mapToCompletionItems(constants, Constant),
						...mapToCompletionItems(keywords, Keyword),
						...mapToCompletionItems(dataTypes, TypeParameter),
						...mapToCompletionItems(dynamicIdentifier, Keyword),
						...mapToCompletionItems(dynamicSystemDatabases, Keyword),
						...mapToCompletionItems(dynamicKeyword, Keyword),
						...mapToCompletionItems(dynamicString, Text),
						...mapToCompletionItems(templateVariables.map((item: string) => `${item}`), Variable),
					] 
				} as any
			},
		});
	};

	// TODO: add use effect to databases autocompletion
	monacoInstance.languages.register({ id: LANGUAGE_ID });
	tokenize();
	defineTheme();
	registerAutocompletion(templateVariables, monacoInstance);

	return {theme: THEME_NAME, language: LANGUAGE_ID}
};
