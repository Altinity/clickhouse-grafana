export default class Scanner {
    token: any;
    AST: any;
    skipSpace: boolean;
    re: any;
    _sOriginal: any;
    _s: any;
    /** @ngInject */
    constructor(s: any);
    raw(): any;
    expect(token: any): void;
    isToken(token: any): boolean;
    expectNext(): void;
    prev(): void;
    next(): boolean;
    _next(): boolean;
    Format(): string;
    Highlight(): string;
    wrapWithColor(color: any): string;
    toAST(): {};
}
