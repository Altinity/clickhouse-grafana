export default class Scanner {
    tree: any;
    rootToken: any;
    token: any;
    skipSpace: boolean;
    re: RegExp;
    expectedNext: boolean;
    _sOriginal: any;
    _s: any;
    /** @ngInject */
    constructor(s: any);
    raw(): any;
    expect(token: any): void;
    isToken(token: any): boolean;
    expectNext(): void;
    next(): boolean;
    _next(): boolean;
    Format(): string;
    Print(ast: any): string;
    push(argument: any): void;
    setRoot(token: any): void;
    isExpectedNext(): boolean;
    appendToken(argument: any): string;
    toAST(): any;
}
