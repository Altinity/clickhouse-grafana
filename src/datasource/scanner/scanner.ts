import { isArray, isEmpty, toLower } from 'lodash';
const wsRe = '\\s+';
const commentRe = "--(([^'\n]*[']){2})*[^'\n]*(?=\n|$)|" + '/\\*(?:[^*]|\\*[^/])*\\*/';
const idRe = '[a-zA-Z_][a-zA-Z_0-9]*';
const intRe = '\\d+';
const powerIntRe = '\\d+e\\d+';
const floatRe = '\\d+\\.\\d*|\\d*\\.\\d+|\\d+[eE][-+]\\d+';
const stringRe = '(\'(?:[^\'\\\\]|\\\\.)*\')|(`(?:[^`\\\\]|\\\\.)*`)|("(?:[^"\\\\]|\\\\.)*")';
const binaryOpRe = '=>|\\|\\||>=|<=|==|!=|<>|->|[-+/%*=<>\\.!]';
const statementRe = '\\b(with|select|from|where|having|order by|group by|limit|format|prewhere|union all)\\b';
const joinsRe =
  '\\b(' +
  'left\\s+array\\s+join|' +
  'array\\s+join|' +
  'global\\s+any\\s+inner\\s+outer\\s+join|' +
  'global\\s+any\\s+inner\\s+join|' +
  'global\\s+any\\s+left\\s+outer\\s+join|' +
  'global\\s+any\\s+left\\s+join|' +
  'global\\s+any\\s+right\\s+outer\\s+join|' +
  'global\\s+any\\s+right\\s+join|' +
  'global\\s+any\\s+full\\s+outer\\s+join|' +
  'global\\s+any\\s+full\\s+join|' +
  'global\\s+any\\s+cross\\s+outer\\s+join|' +
  'global\\s+any\\s+cross\\s+join|' +
  'global\\s+any\\s+outer\\s+join|' +
  'global\\s+any\\s+join|' +
  'global\\s+all\\s+inner\\s+outer\\s+join|' +
  'global\\s+all\\s+inner\\s+join|' +
  'global\\s+all\\s+left\\s+outer\\s+join|' +
  'global\\s+all\\s+left\\s+join|' +
  'global\\s+all\\s+right\\s+outer\\s+join|' +
  'global\\s+all\\s+right\\s+join|' +
  'global\\s+all\\s+full\\s+outer\\s+join|' +
  'global\\s+all\\s+full\\s+join|' +
  'global\\s+all\\s+cross\\s+outer\\s+join|' +
  'global\\s+all\\s+cross\\s+join|' +
  'global\\s+all\\s+outer\\s+join|' +
  'global\\s+all\\s+join|' +
  'global\\s+inner\\s+outer\\s+join|' +
  'global\\s+inner\\s+join|' +
  'global\\s+left\\s+outer\\s+join|' +
  'global\\s+left\\s+join|' +
  'global\\s+right\\s+outer\\s+join|' +
  'global\\s+right\\s+join|' +
  'global\\s+full\\s+outer\\s+join|' +
  'global\\s+full\\s+join|' +
  'global\\s+cross\\s+outer\\s+join|' +
  'global\\s+cross\\s+join|' +
  'global\\s+outer\\s+join|' +
  'global\\s+join|' +
  'any\\s+inner\\s+outer\\s+join|' +
  'any\\s+inner\\s+join|' +
  'any\\s+left\\s+outer\\s+join|' +
  'any\\s+left\\s+join|' +
  'any\\s+right\\s+outer\\s+join|' +
  'any\\s+right\\s+join|' +
  'any\\s+full\\s+outer\\s+join|' +
  'any\\s+full\\s+join|' +
  'any\\s+cross\\s+outer\\s+join|' +
  'any\\s+cross\\s+join|' +
  'any\\s+outer\\s+join|' +
  'any\\s+join|' +
  'all\\s+inner\\s+outer\\s+join|' +
  'all\\s+inner\\s+join|' +
  'all\\s+left\\s+outer\\s+join|' +
  'all\\s+left\\s+join|' +
  'all\\s+right\\s+outer\\s+join|' +
  'all\\s+right\\s+join|' +
  'all\\s+full\\s+outer\\s+join|' +
  'all\\s+full\\s+join|' +
  'all\\s+cross\\s+outer\\s+join|' +
  'all\\s+cross\\s+join|' +
  'all\\s+outer\\s+join|' +
  'all\\s+join|' +
  'inner\\s+outer\\s+join|' +
  'inner\\s+join|' +
  'left\\s+outer\\s+join|' +
  'left\\s+join|' +
  'right\\s+outer\\s+join|' +
  'right\\s+join|' +
  'full\\s+outer\\s+join|' +
  'full\\s+join|' +
  'cross\\s+outer\\s+join|' +
  'cross\\s+join|' +
  'outer\\s+join|' +
  'join' +
  ')\\b';
const onJoinTokenRe = '\\b(using|on)\\b';
const tableNameRe = '([A-Za-z0-9_]+|[A-Za-z0-9_]+\\.[A-Za-z0-9_]+)';
const macroFuncRe =
  '(\\$rateColumnsAggregated|\\$rateColumns|\\$perSecondColumns|\\$deltaColumns|\\$increaseColumns|\\$rate|\\$perSecond|\\$delta|\\$increase|\\$columns)';
const condRe = '\\b(or|and)\\b';
const inRe = '\\b(global in|global not in|not in|in)\\b';
const closureRe = '[\\(\\)\\[\\]]';
const specCharsRe = '[,?:]';
const macroRe = '\\$[A-Za-z0-9_$]+';
const skipSpaceRe = '[\\(\\.! \\[]';
const tableFuncRe =
  '\\b(sqlite|file|remote|remoteSecure|cluster|clusterAllReplicas|merge|numbers|url|mysql|postgresql|jdbc|odbc|hdfs|input|generateRandom|s3|s3Cluster)\\b';
const wsOnlyRe = new RegExp('^(?:' + wsRe + ')$');
const commentOnlyRe = new RegExp('^(?:' + commentRe + ')$');
const idOnlyRe = new RegExp('^(?:' + idRe + ')$');
const closureOnlyRe = new RegExp('^(?:' + closureRe + ')$');
const macroFuncOnlyRe = new RegExp('^(?:' + macroFuncRe + ')$');
const statementOnlyRe = new RegExp('^(?:' + statementRe + ')$', 'i');
const joinsOnlyRe = new RegExp('^(?:' + joinsRe + ')$', 'i');
const onJoinTokenOnlyRe = new RegExp('^(?:' + onJoinTokenRe + ')$', 'i');
const tableNameOnlyRe = new RegExp('^(?:' + tableNameRe + ')$', 'i');
const tableFuncOnlyRe = new RegExp('^(?:' + tableFuncRe + ')$', 'i');
const macroOnlyRe = new RegExp('^(?:' + macroRe + ')$', 'i');
const inOnlyRe = new RegExp('^(?:' + inRe + ')$', 'i');
const condOnlyRe = new RegExp('^(?:' + condRe + ')$', 'i');
const skipSpaceOnlyRe = new RegExp('^(?:' + skipSpaceRe + ')$');

const tokenRe = [
  statementRe,
  macroFuncRe,
  joinsRe,
  inRe,
  wsRe,
  commentRe,
  idRe,
  stringRe,
  powerIntRe,
  floatRe,
  intRe,
  binaryOpRe,
  closureRe,
  specCharsRe,
  macroRe,
].join('|');

const tabSize = '    '; // 4 spaces
const newLine = '\n';

export default class Scanner {
  tree: any;
  rootToken: any;
  token: any;
  skipSpace: boolean | undefined;
  re: RegExp | undefined;
  expectedNext: boolean | undefined;

  _sOriginal: any;
  _s: any;

  /** @ngInject */
  constructor(s) {
    this._sOriginal = s;
    this.token = null;
  }

  raw() {
    return this._sOriginal;
  }

  expectNext() {
    if (!this.next()) {
      throw 'expecting additional token at the end of query [' + this._sOriginal + ']';
    }
    return true;
  }

  next() {
    while (this._next()) {
      if (this.skipSpace && isWS(this.token)) {
        // skip whitespace
        continue;
      }
      return true;
    }
    return false;
  }

  _next() {
    if (this._s.length === 0) {
      return false;
    }
    // @ts-ignore
    let r = this.re.exec(this._s);
    if (r === null) {
      throw 'cannot find next token in [' + this._s + ']';
    }

    this.token = r[0];
    this._s = this._s.substring(this.token.length);

    return true;
  }

  Format() {
    return print(this.toAST());
  }

  Print(ast) {
    return print(ast);
  }

  push(argument) {
    if (Array.isArray(this.tree[this.rootToken])) {
      this.tree[this.rootToken].push(argument);
    } else if (this.tree[this.rootToken] instanceof Object) {
      if (!this.tree[this.rootToken].hasOwnProperty('aliases')) {
        this.tree[this.rootToken].aliases = [];
      }
      this.tree[this.rootToken].aliases.push(argument);
    }
    this.expectedNext = false;
  }

  setRoot(token) {
    this.rootToken = token.toLowerCase();
    this.tree[this.rootToken] = [];
    this.expectedNext = true;
  }

  isExpectedNext(): boolean {
    let v = this.expectedNext;
    this.expectedNext = false;
    return v as boolean
  }

  appendToken(argument): string {
    return argument === '' || isSkipSpace(argument[argument.length - 1]) ? this.token : ' ' + this.token;
  }

  toAST() {
    this._s = this._sOriginal;
    this.tree = {};
    this.setRoot('root');
    this.expectedNext = false;
    this.skipSpace = true;
    this.re = new RegExp('^(?:' + tokenRe + ')', 'i');
    let subQuery = '',
      argument = '';

    while (this.next()) {
      if (!this.isExpectedNext() && isStatement(this.token) && !this.tree.hasOwnProperty(toLower(this.token))) {
        if (this.token.toUpperCase() === 'WITH' && this.rootToken === 'order by') {
          argument += this.appendToken(argument);
          continue;
        }
        if (!isClosured(argument)) {
          argument += this.appendToken(argument);
          continue;
        }
        if (argument.length > 0) {
          this.push(argument);
          argument = '';
        }
        this.setRoot(this.token);
      } else if (this.token === ',' && isClosured(argument)) {
        this.push(argument);
        argument = '';
        if (this.rootToken === 'where') {
          this.push(this.token);
        }
        this.expectedNext = true;
      } else if (isClosureChars(this.token) && this.rootToken === 'from') {
        subQuery = betweenBraces(this._s);
        if (!isTableFunc(argument)) {
          this.tree[this.rootToken] = toAST(subQuery);
        } else {
          this.push(argument + '(' + subQuery + ')');
          argument = '';
        }
        this._s = this._s.substring(subQuery.length + 1);
      } else if (isMacroFunc(this.token)) {
        let func = this.token;
        if (!this.next()) {
          throw 'wrong function signature for `' + func + '` at [' + this._s + ']';
        }

        subQuery = betweenBraces(this._s);
        let subAST = toAST(subQuery);
        if (isSet(subAST, 'root')) {
          this.tree[func] = subAST['root'].map(function (item) {
            return item;
          });
        } else {
          this.tree[func] = subAST;
        }
        this._s = this._s.substring(subQuery.length + 1);

        // macro funcs are used instead of SELECT statement
        this.tree['select'] = [];
      } else if (isIn(this.token)) {
        argument += ' ' + this.token;
        if (!this.next()) {
          throw 'wrong in signature for `' + argument + '` at [' + this._s + ']';
        }

        if (isClosureChars(this.token)) {
          subQuery = betweenBraces(this._s);
          let subAST = toAST(subQuery);
          if (isSet(subAST, 'root')) {
            argument +=
              ' (' +
              subAST['root'].map(function (item) {
                return item;
              });
            argument = argument + ')';
          } else {
            argument += ' (' + newLine + print(subAST, tabSize) + ')';
            if (this.rootToken !== 'select') {
              this.push(argument);
              argument = '';
            }
          }
          this._s = this._s.substring(subQuery.length + 1);
        } else {
          argument += ' ' + this.token;
        }
      } else if (isCond(this.token) && (this.rootToken === 'where' || this.rootToken === 'prewhere')) {
        if (isClosured(argument)) {
          this.push(argument);
          argument = this.token;
        } else {
          argument += ' ' + this.token;
        }
      } else if (isJoin(this.token)) {
        argument = this.parseJOIN(argument);
      } else if (this.rootToken === 'union all') {
        let statement = 'union all';
        this._s = this.token + ' ' + this._s;
        let subQueryPos = this._s.toLowerCase().indexOf(statement);
        while (subQueryPos !== -1) {
          let subQuery = this._s.substring(0, subQueryPos);
          let ast = toAST(subQuery);
          this.tree[statement].push(ast);
          this._s = this._s.substring(subQueryPos + statement.length, this._s.length);
          subQueryPos = this._s.toLowerCase().indexOf(statement);
        }
        let ast = toAST(this._s);
        this._s = '';
        this.tree[statement].push(ast);
      } else if (isComment(this.token)) {
        //comment is part of push element, and will be add after next statement
        argument += this.token + '\n';
      } else if (isClosureChars(this.token) || this.token === '.') {
        argument += this.token;
      } else if (this.token === ',') {
        argument += this.token + ' ';
      } else {
        argument += this.appendToken(argument);
      }
    }

    if (argument !== '') {
      this.push(argument);
    }
    return this.tree;
  }

  parseJOIN(argument) {
    if (!this.tree.hasOwnProperty('join')) {
      this.tree['join'] = [];
    }
    let joinType = this.token,
      source;
    if (!this.next()) {
      throw 'wrong join signature for `' + joinType + '` at [' + this._s + ']';
    }

    if (isClosureChars(this.token)) {
      let subQuery = betweenBraces(this._s);
      source = toAST(subQuery);
      this._s = this._s.substring(subQuery.length + 1);
      this.token = '';
    } else {
      source = '';
      do {
        if (
          isID(this.token) &&
          !isTable(source) &&
          this.token.toUpperCase() !== 'AS' &&
          !onJoinTokenOnlyRe.test(this.token)
        ) {
          source += this.token;
        } else if (isMacro(this.token)) {
          source += this.token;
        } else if (this.token === '.') {
          source += this.token;
        } else {
          break;
        }
      } while ((joinType.toUpperCase().indexOf('ARRAY JOIN') === -1 && this.expectNext()) || this.next());
      if (this.token === source) {
        this.token = '';
      }
      source = [source];
    }
    // @ts-ignore
    let joinAST: null = { type: joinType, source: source, aliases: [], using: [], on: [] };
    do {
      if (this.token !== '' && !onJoinTokenOnlyRe.test(this.token)) {
        // @ts-ignore
        joinAST.aliases.push(this.token);
      } else if (onJoinTokenOnlyRe.test(this.token)) {
        break;
      }
    } while ((joinType.toUpperCase().indexOf('ARRAY JOIN') === -1 && this.expectNext()) || this.next());
    const joinExprToken = toLower(this.token);
    let joinConditions = '';
    while (this.next()) {
      if (isStatement(this.token)) {
        if (argument !== '') {
          this.push(argument);
          argument = '';
        }
        this.setRoot(this.token);
        break;
      }
      if (isJoin(this.token)) {
        if (joinConditions !== '') {
          // @ts-ignore
          joinAST.on.push(joinConditions);
          joinConditions = '';
        }
        this.tree['join'].push(joinAST);
        joinAST = null;
        argument = this.parseJOIN(argument);
        break;
      }

      if (joinExprToken === 'using') {
        if (!isID(this.token)) {
          continue;
        }

        // @ts-ignore
        joinAST.using.push(this.token);
      } else {
        if (isCond(this.token)) {
          joinConditions += ' ' + this.token.toUpperCase() + ' ';
        } else {
          joinConditions += this.token;
        }
      }
    }
    if (joinAST != null) {
      if (joinConditions !== '') {
        // @ts-ignore
        joinAST.on.push(joinConditions);
      }
      this.tree['join'].push(joinAST);
    }
    return argument;
  }

  static RemoveComments(query) {
    return query.replace(new RegExp(commentRe, 'g'), '');
  }

  static AddMetadata(query) {
    return "/* grafana dashboard=$__dashboard, user=$__user */ " + query
  }

}
const isSkipSpace = (token: string) => skipSpaceOnlyRe.test(token);
const isCond = (token: string) => condOnlyRe.test(token);
const isIn = (token: string) => inOnlyRe.test(token);
const isJoin = (token: string) => joinsOnlyRe.test(token);
const isTable = (token: string) => tableNameOnlyRe.test(token);
const isWS = (token: string) => wsOnlyRe.test(token);
const isMacroFunc = (token: string) => macroFuncOnlyRe.test(token);
const isMacro = (token: string) => macroOnlyRe.test(token);
const isComment = (token: string) => commentOnlyRe.test(token);
const isID = (token: string) => idOnlyRe.test(token);
const isStatement = (token: string) => statementOnlyRe.test(token);
const isTableFunc = (token: string) => tableFuncOnlyRe.test(token);
const isClosureChars = (token: string) => closureOnlyRe.test(token);

function printItems(items, tab = '', separator = '') {
  let result = '';
  if (isArray(items)) {
    if (items.length === 1) {
      result += ' ' + items[0] + newLine;
    } else {
      result += newLine;
      items.forEach(function (item, i) {
        result += tab + tabSize + item;
        if (i !== items.length - 1) {
          result += separator;
          result += newLine;
        }
      });
    }
  } else {
    result = newLine + '(' + newLine + print(items, tab + tabSize) + newLine + ')';
  }

  return result;
}

function toAST(s) {
  let scanner = new Scanner(s);
  return scanner.toAST();
}

function isSet(obj, prop) {
  return obj.hasOwnProperty(prop) && !isEmpty(obj[prop]);
}

function isClosured(argument) {
  return (argument.match(/\(/g) || []).length === (argument.match(/\)/g) || []).length;
}

function betweenBraces(query) {
  let openBraces = 1,
    subQuery = '';
  for (let i = 0; i < query.length; i++) {
    if (query.charAt(i) === '(') {
      openBraces++;
    }
    if (query.charAt(i) === ')') {
      if (openBraces === 1) {
        subQuery = query.substring(0, i);
        break;
      }
      openBraces--;
    }
  }
  return subQuery;
}

// see https://clickhouse.tech/docs/en/sql-reference/statements/select/
function print(AST, tab = '') {
  let result = '';
  if (isSet(AST, 'root')) {
    result += printItems(AST.root, '\n', '\n');
  }

  if (isSet(AST, '$rate')) {
    result += tab + '$rate(';
    result += printItems(AST.$rate, tab, ',') + ')';
  }

  if (isSet(AST, '$perSecond')) {
    result += tab + '$perSecond(';
    result += printItems(AST.$perSecond, tab, ',') + ')';
  }

  if (isSet(AST, '$perSecondColumns')) {
    result += tab + '$perSecondColumns(';
    result += printItems(AST.$perSecondColumns, tab, ',') + ')';
  }

  if (isSet(AST, '$delta')) {
    result += tab + '$delta(';
    result += printItems(AST.$delta, tab, ',') + ')';
  }

  if (isSet(AST, '$deltaColumns')) {
    result += tab + '$deltaColumns(';
    result += printItems(AST.$deltaColumns, tab, ',') + ')';
  }

  if (isSet(AST, '$increase')) {
    result += tab + '$increase(';
    result += printItems(AST.$delta, tab, ',') + ')';
  }

  if (isSet(AST, '$increaseColumns')) {
    result += tab + '$increaseColumns(';
    result += printItems(AST.$deltaColumns, tab, ',') + ')';
  }

  if (isSet(AST, '$columns')) {
    result += tab + '$columns(';
    result += printItems(AST.$columns, tab, ',') + ')';
  }

  if (isSet(AST, '$rateColumns')) {
    result += tab + '$rateColumns(';
    result += printItems(AST.$rateColumns, tab, ',') + ')';
  }

  if (isSet(AST, '$rateColumnsAggregated')) {
    result += tab + '$rateColumnsAggregated(';
    result += printItems(AST.$rateColumnsAggregated, tab, ',') + ')';
  }

  if (isSet(AST, 'with')) {
    result += tab + 'WITH';
    result += printItems(AST.with, tab, ',');
  }

  if (isSet(AST, 'select')) {
    result += tab + 'SELECT';
    result += printItems(AST.select, tab, ',');
  }

  if (isSet(AST, 'from')) {
    result += newLine + tab + 'FROM';
    result += printItems(AST.from, tab);
  }

  if (isSet(AST, 'aliases')) {
    result += printItems(AST.aliases, '', ' ');
  }

  if (isSet(AST, 'join')) {
    AST.join.forEach(function (item) {
      result +=
        newLine +
        tab +
        item.type.toUpperCase() +
        printItems(item.source, tab) +
        ' ' +
        printItems(item.aliases, '', ' ');
      if (item.using.length > 0) {
        result += ' USING ' + printItems(item.using, '', ' ');
      } else if (item.on.length > 0) {
        result += ' ON ' + printItems(item.on, tab, ' ');
      }
    });
  }

  if (isSet(AST, 'prewhere')) {
    result += newLine + tab + 'PREWHERE';
    result += printItems(AST.prewhere, tab);
  }

  if (isSet(AST, 'where')) {
    result += newLine + tab + 'WHERE';
    result += printItems(AST.where, tab);
  }

  if (isSet(AST, 'group by')) {
    result += newLine + tab + 'GROUP BY';
    result += printItems(AST['group by'], tab, ',');
  }

  if (isSet(AST, 'having')) {
    result += newLine + tab + 'HAVING';
    result += printItems(AST.having, tab);
  }

  if (isSet(AST, 'order by')) {
    result += newLine + tab + 'ORDER BY';
    result += printItems(AST['order by'], tab, ',');
  }

  if (isSet(AST, 'limit')) {
    result += newLine + tab + 'LIMIT';
    result += printItems(AST.limit, tab, ',');
  }

  if (isSet(AST, 'union all')) {
    AST['union all'].forEach(function (v) {
      result += newLine + newLine + tab + 'UNION ALL' + newLine + newLine;
      result += print(v, tab);
    });
  }

  if (isSet(AST, 'format')) {
    result += newLine + tab + 'FORMAT';
    result += printItems(AST.format, tab);
  }

  return result;
}



