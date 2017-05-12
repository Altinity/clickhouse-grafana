define([
  'lodash'
],
function (_) {
  'use strict';

  function Scanner(s) {
    this._sOriginal = s;
    this.token = null;
    this.AST = {};
  }

  var s = Scanner.prototype;

  s.raw = function() {
    return this._sOriginal;
  };

  s.expect = function (token) {
    this.expectNext();
    if (!this.isToken(token)) {
      throw("expecting [" + token + "], but got [" + this.token + "] at [" + this._s + "]");
    }
  };

  s.isToken = function (token) {
    return _.toUpper(token) === _.toUpper(this.token);
  };

  s.expectNext = function () {
    if (!this.next()) {
      throw("expecting additional token at the end of query [" + this._sOriginal + "]");
    }
  };

  s.prev = function () {
    if (this.token === null) {
      throw("BUG: prev called on empty token");
    }
    this._s = this.token + " " + this._s;
    this.token = null;
  };

  s.next = function () {
    while (this._next()) {
      if (this.skipSpace && isWS(this.token)) {
        // skip whitespace
        continue;
      }
      if (isComment(this.token)) {
        // skip comment
        continue;
      }
      return true;
    }

    return false;
  };

  s._next = function () {
    if (this._s.length === 0) {
      return false;
    }
    var r = this.re.exec(this._s);
    if (r === null) {
      throw("cannot find next token in [" + this._s + "]");
    }

    this.token = r[0];
    this._s = this._s.substring(this.token.length);
    return true;
  };

  s.Format = function () {
    return print(this.toAST());
  };

  s.Highlight = function () {
    this._s = this._sOriginal;
    var r = '';
    this.skipSpace = false;
    this.re = new RegExp("^(?:" + highlightTokenRe + ")", 'i');

    while (this.next()) {
      if (isOperator(this.token) || isJoin(this.token)) {
        r += this.wrapWithColor('darkorange');
      } else if (isBuiltInFunc(this.token)) {
        r += this.wrapWithColor('navajowhite');
      } else if (isDataType(this.token)) {
        r += this.wrapWithColor('darkseagreen');
      } else if (isMacroFunc(this.token) || isMacro(this.token)) {
        r += this.wrapWithColor('darkcyan');
      } else if (isNum(this.token)) {
        r += this.wrapWithColor('cornflowerblue');
      } else if (isString(this.token)) {
        r += this.wrapWithColor('lightgreen');
      } else if (isCond(this.token) || isBinary(this.token)) {
        r += this.wrapWithColor('yellow');
      } else {
        r += this.token;
      }
    }
    var htmlQuery = r.replace(/  /g, '\u00a0\u00a0');
    htmlQuery = htmlQuery.replace(/(?:\r\n|\r|\n)/g, '<br />');

    return htmlQuery;
  };

  s.wrapWithColor = function (color) {
    return '<font color="' + color + '">' +
        this.token +
        '</font>';
  };

  s.toAST = function () {
    this._s = this._sOriginal;
    this.skipSpace = true;
    this.re = new RegExp("^(?:" + tokenRe + ")", 'i');
    var rootToken = 'root',
        subQuery = '',
        argument = '',
        ast = {},
        subAST = {};

    ast[rootToken] = [];
    while (this.next()) {
      if (isStatement(this.token) && !ast.hasOwnProperty(_.toLower(this.token))) {

        if (argument !== '') {
          ast[rootToken].push(argument);
          argument = '';
        }

        rootToken = _.toLower(this.token);
        ast[rootToken] = [];
      }
      else if (this.token === ',' && isClosured(argument))  {
        ast[rootToken].push(argument);
        argument = '';
      }
      else if (isClosureChars(this.token) && rootToken === 'from') {
        subQuery = betweenBraces(this._s);
        ast[rootToken] = toAST(subQuery);
        this._s = this._s.substring(subQuery.length+1);
      }
      else if (isMacroFunc(this.token)) {
        var func = this.token;
        if (!this.next()) {
          throw("wrong function signature for `" + func + "` at [" + this._s + "]");
        }

        subQuery = betweenBraces(this._s);
        subAST = toAST(subQuery);
        if (isSet(subAST, 'root')) {
          ast[func] = subAST.root.map(function(item) {
                return item;
              });
        } else {
          ast[func] = subAST;
        }
        this._s = this._s.substring(subQuery.length+1);

        // macro funcs are used instead of SELECT statement
        ast['select'] = [];
      }
      else if (isIn(this.token)) {
        argument += ' ' + this.token;
        if (!this.next()) {
          throw("wrong in signature for `" + argument + "` at [" + this._s + "]");
        }

        if (isClosureChars(this.token)) {
          subQuery = betweenBraces(this._s);
          subAST = toAST(subQuery);
          if (isSet(subAST, 'root')) {
            argument += ' (' + subAST.root.map(function(item) {
                  return item;
                });
            argument = argument + ')';
          } else {
            argument += ' (' + newLine + print(subAST, tabSize) + ')';
            ast[rootToken].push(argument);
            argument = '';
          }
          this._s = this._s.substring(subQuery.length+1);
        } else {
          argument += ' ' + this.token;
        }
      }
      else if (isCond(this.token) && (rootToken === 'where' || rootToken === 'prewhere')) {
        if (isClosured(argument)) {
          ast[rootToken].push(argument);
          argument = this.token;
        } else {
          argument += ' ' + this.token;
        }
      }
      else if (isJoin(this.token)) {
        var joinType = this.token, source;
        if (!this.next()) {
          throw("wrong join signature for `" + joinType + "` at [" + this._s + "]");
        }

        if (isClosureChars(this.token)) {
          subQuery = betweenBraces(this._s);
          source = toAST(subQuery);
          this._s = this._s.substring(subQuery.length+1);
        } else {
          source = [this.token];
        }

        this.expect('using');
        ast['join'] = {type: joinType, source: source, using: []};
        while(this.next()) {
          if (!isID(this.token)) {
            continue;
          }

          if (isStatement(this.token)) {
            if (argument !== '') {
              ast[rootToken].push(argument);
              argument = '';
            }
            rootToken = this.token.toLowerCase();
            ast[rootToken] = [];
            break;
          }

          ast['join'].using.push(this.token);
        }
      } else if (isClosureChars(this.token)) {
        argument += this.token;
      } else if (this.token === '.') {
        argument += this.token;
      } else if (this.token === ',') {
        argument += this.token + ' ';
      } else {
        argument += argument === '' || isSkipSpace(argument[argument.length-1]) ? this.token : ' ' + this.token;
      }
    }

    if (argument !== '') {
      ast[rootToken].push(argument);
    }
    this.AST = ast;
    console.log(JSON.stringify(ast))
    return ast;
  };

  // see https://clickhouse.yandex/reference_ru.html#SELECT
  function print(AST, tab) {
    var result = '';
    tab = !tab ? '' : tab;

    if (isSet(AST, '$rate')) {
      result += tab + '$rate(';
      result += printItems(AST.$rate, tab, ',') + ')';
    }

    if (isSet(AST, '$columns')) {
      result += tab + '$columns(';
      result += printItems(AST.$columns, tab, ',') + ')';
    }

    if (isSet(AST,'$rateColumns')) {
      result += tab + '$rateColumns(';
      result += printItems(AST.$rateColumns, tab, ',') + ')';
    }

    if (isSet(AST, 'select')) {
      result += tab + 'SELECT';
      result += printItems(AST.select, tab, ',');
    }

    if (isSet(AST, 'from')) {
      result += newLine + tab + 'FROM';
      result += printItems(AST.from, tab);
    }

    if (isSet(AST, 'join')) {
      result += tab + newLine + AST.join.type.toUpperCase()  +
          printItems(AST.join.source, tab) +
          ' USING ' + printItems(AST.join.using, tab, ',');
    }

    if (isSet(AST, 'prewhere')) {
      result += newLine + tab + 'PREWHERE';
      result += printItems(AST.prewhere, tab);
    }

    if (isSet(AST, 'where')) {
      result += newLine + tab + 'WHERE';
      result += printItems(AST.where, tab);
    }

    if (isSet(AST,'group by')) {
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
      result += printItems(AST.limit, tab);
    }

    if (isSet(AST, 'union all')) {
      result += newLine + tab + 'UNION ALL';
      result += printItems(AST['union all'], tab);
    }

    if (isSet(AST, 'format')) {
      result += newLine + tab + 'FORMAT';
      result += printItems(AST.format, tab);
    }

    return result;
  }

  var tabSize = '    ', // 4 spaces
      newLine = '\n';

  function printItems(items, tab, separator) {
    var result = '';
    tab = !tab ? '' : tab;
    separator = !separator ? '' : separator;

    if (_.isArray(items)) {
      if (items.length === 1) {
        result += ' ' + items[0];
      } else {
        result += newLine;
        items.forEach(function(item, i) {
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

  var wsRe = "\\s+",
      commentRe = "--[^\n]*|/\\*(?:[^*]|\\*[^/])*\\*/",
      idRe = "[a-zA-Z_][a-zA-Z_0-9]*",
      intRe = "\\d+",
      powerIntRe = "\\d+e\\d+",
      floatRe = "\\d+\\.\\d*|\\d*\\.\\d+|\\d+[eE][-+]\\d+",
      stringRe = "('[^']*')|(`[^`]*`)",
      binaryOpRe = "=>|\\|\\||>=|<=|==|!=|<>|[-+/%*=<>\\.!]",
      statementRe = "(select|from|where|having|order by|group by|limit|format|prewhere|union all)",
      joinsRe = "(any inner join|any left join|all inner join|all left join"+
          "|global any inner join|global any left join|global all inner join|global all left join)",
      macroFuncRe = "(\\$rateColumns|\\$rate|\\$columns)",
      condRe = "\\b(or|and)\\b",
      inRe = "\\b(global in|global not in|not in|in)\\b",
      closureRe = "[\\(\\)]",
      specCharsRe = "[,?:]",
      macroRe = "\\$\\w+",
      skipSpaceRe = "[\\(\\.!]",

      builtInFuncRe = "\\b(avg|countIf|first|last|max|min|sum|sumIf|ucase|lcase|mid|round|rank|now|" +
          "coalesce|ifnull|isnull|nvl|count|timeSlot|yesterday|today|now|toRelativeSecondNum|" +
          "toRelativeMinuteNum|toRelativeHourNum|toRelativeDayNum|toRelativeWeekNum|toRelativeMonthNum|" +
          "toRelativeYearNum|toTime|toStartOfHour|toStartOfFiveMinute|toStartOfMinute|toStartOfYear|" +
          "toStartOfQuarter|toStartOfMonth|toMonday|toSecond|toMinute|toHour|toDayOfWeek|toDayOfMonth|" +
          "toMonth|toYear|toFixedString|toStringCutToZero|reinterpretAsString|reinterpretAsDate|" +
          "reinterpretAsDateTime|reinterpretAsFloat32|reinterpretAsFloat64|reinterpretAsInt8|" +
          "reinterpretAsInt16|reinterpretAsInt32|reinterpretAsInt64|reinterpretAsUInt8|" +
          "reinterpretAsUInt16|reinterpretAsUInt32|reinterpretAsUInt64|toUInt8|toUInt16|toUInt32|" +
          "toUInt64|toInt8|toInt16|toInt32|toInt64|toFloat32|toFloat64|toDate|toDateTime|toString|" +
          "bitAnd|bitOr|bitXor|bitNot|bitShiftLeft|bitShiftRight|abs|negate|modulo|intDivOrZero|" +
          "intDiv|divide|multiply|minus|plus|empty|notEmpty|length|lengthUTF8|lower|upper|lowerUTF8|" +
          "upperUTF8|reverse|reverseUTF8|concat|substring|substringUTF8|appendTrailingCharIfAbsent|" +
          "position|positionUTF8|match|extract|extractAll|like|notLike|replaceOne|replaceAll|" +
          "replaceRegexpOne|range|arrayElement|has|indexOf|countEqual|arrayEnumerate|arrayEnumerateUniq|" +
          "arrayJoin|arrayMap|arrayFilter|arrayExists|arrayCount|arrayAll|arrayFirst|arraySum|splitByChar|" +
          "splitByString|alphaTokens|domainWithoutWWW|topLevelDomain|firstSignificantSubdomain|" +
          "cutToFirstSignificantSubdomain|queryString|URLPathHierarchy|URLHierarchy|extractURLParameterNames|" +
          "extractURLParameters|extractURLParameter|queryStringAndFragment|cutWWW|cutQueryString|" +
          "cutFragment|cutQueryStringAndFragment|cutURLParameter|IPv4NumToString|IPv4StringToNum|" +
          "IPv4NumToStringClassC|IPv6NumToString|IPv6StringToNum|rand|rand64|halfMD5|MD5|sipHash64|" +
          "sipHash128|cityHash64|intHash32|intHash64|SHA1|SHA224|SHA256|URLHash|hex|unhex|bitmaskToList|" +
          "bitmaskToArray|floor|ceil|round|roundToExp2|roundDuration|roundAge|regionToCountry|" +
          "regionToContinent|regionToPopulation|regionIn|regionHierarchy|regionToName|OSToRoot|OSIn|" +
          "OSHierarchy|SEToRoot|SEIn|SEHierarchy|dictGetUInt8|dictGetUInt16|dictGetUInt32|" +
          "dictGetUInt64|dictGetInt8|dictGetInt16|dictGetInt32|dictGetInt64|dictGetFloat32|" +
          "dictGetFloat64|dictGetDate|dictGetDateTime|dictGetString|dictGetHierarchy|dictHas|dictIsIn|" +
          "argMin|argMax|uniqCombined|uniqHLL12|uniqExact|uniqExactIf|groupArray|groupUniqArray|quantile|" +
          "quantileDeterministic|quantileTiming|quantileTimingWeighted|quantileExact|" +
          "quantileExactWeighted|quantileTDigest|median|quantiles|varSamp|varPop|stddevSamp|stddevPop|" +
          "covarSamp|covarPop|corr|sequenceMatch|sequenceCount|uniqUpTo|countIf|avgIf|" +
          "quantilesTimingIf|argMinIf|uniqArray|sumArray|quantilesTimingArrayIf|uniqArrayIf|medianIf|" +
          "quantilesIf|varSampIf|varPopIf|stddevSampIf|stddevPopIf|covarSampIf|covarPopIf|corrIf|" +
          "uniqArrayIf|sumArrayIf|uniq)\\b",
      operatorRe = "\\b(select|group by|order by|from|where|limit|offset|having|as|" +
          "when|else|end|type|left|right|on|outer|desc|asc|union|primary|key|between|" +
          "foreign|not|references|default|null|inner|cross|natural|database|" +
          "attach|detach|describe|optimize|prewhere|totals|databases|processlist|show|format|using|global|in)\\b",
      dataTypeRe = "\\b(int|numeric|decimal|date|varchar|char|bigint|float|double|bit|binary|text|set|timestamp|" +
          "money|real|number|integer|" +
          "uint8|uint16|uint32|uint64|int8|int16|int32|int64|float32|float64|datetime|enum8|enum16|" +
          "array|tuple|string)\\b",

      wsOnlyRe = new RegExp("^(?:" + wsRe + ")$"),
      commentOnlyRe = new RegExp("^(?:" + commentRe + ")$"),
      idOnlyRe = new RegExp("^(?:" + idRe + ")$"),
      closureOnlyRe = new RegExp("^(?:" + closureRe + ")$"),
      macroFuncOnlyRe = new RegExp("^(?:" + macroFuncRe + ")$"),
      statementOnlyRe = new RegExp("^(?:" + statementRe + ")$", 'i'),
      joinsOnlyRe = new RegExp("^(?:" + joinsRe + ")$", 'i'),
      operatorOnlyRe = new RegExp("^(?:" + operatorRe + ")$", 'i'),
      dataTypeOnlyRe = new RegExp("^(?:" + dataTypeRe + ")$"),
      builtInFuncOnlyRe = new RegExp("^(?:"+ builtInFuncRe +")$"),
      macroOnlyRe = new RegExp("^(?:" + macroRe + ")$", 'i'),
      inOnlyRe = new RegExp("^(?:" + inRe + ")$", 'i'),
      condOnlyRe = new RegExp("^(?:" + condRe + ")$", 'i'),
      numOnlyRe = new RegExp("^(?:" + [powerIntRe, intRe, floatRe].join("|") + ")$"),
      stringOnlyRe = new RegExp("^(?:" + stringRe + ")$"),
      skipSpaceOnlyRe = new RegExp("^(?:" + skipSpaceRe + ")$"),
      binaryOnlyRe = new RegExp("^(?:" + binaryOpRe + ")$");

  var tokenRe = [statementRe, macroFuncRe, joinsRe, inRe, wsRe, commentRe, idRe,stringRe, powerIntRe, intRe,
    floatRe, binaryOpRe, closureRe, specCharsRe, macroRe].join("|");
  var highlightTokenRe = [operatorRe, macroFuncRe, joinsRe, builtInFuncRe, dataTypeRe, wsRe, commentRe, powerIntRe, idRe, stringRe, intRe,
    floatRe, binaryOpRe, closureRe, specCharsRe, macroRe].join("|");

  function isSkipSpace(token) {
    return skipSpaceOnlyRe.test(token);
  }

  function isCond(token) {
    return condOnlyRe.test(token);
  }

  function isIn(token) {
    return inOnlyRe.test(token);
  }

  function isJoin(token) {
    return joinsOnlyRe.test(token);
  }

  function isWS(token) {
    return wsOnlyRe.test(token);
  }

  function isMacroFunc(token) {
    return macroFuncOnlyRe.test(token);
  }

  function isMacro(token) {
    return macroOnlyRe.test(token);
  }

  function isComment(token) {
    return commentOnlyRe.test(token);
  }

  function isID(token) {
    return idOnlyRe.test(token);
  }

  function isStatement(token) {
    return statementOnlyRe.test(token);
  }

  function isOperator(token) {
    return operatorOnlyRe.test(token);
  }

  function isDataType(token) {
    return dataTypeOnlyRe.test(token);
  }

  function isBuiltInFunc(token) {
    return builtInFuncOnlyRe.test(token);
  }

  function isClosureChars(token) {
    return closureOnlyRe.test(token);
  }

  function isNum(token) {
    return numOnlyRe.test(token);
  }

  function isString(token) {
    return stringOnlyRe.test(token);
  }

  function isBinary(token) {
    return binaryOnlyRe.test(token);
  }

  function toAST(s) {
    var scanner = new Scanner(s);
    return scanner.toAST();
  }

  function isSet(obj, prop) {
    return obj.hasOwnProperty(prop) && !_.isEmpty(obj[prop]);
  }

  function isClosured(argument) {
    return (argument.match(/\(/g) || []).length === (argument.match(/\)/g) || []).length;
  }

  function betweenBraces(query){
    var openBraces = 1, subQuery = '';
    for (var i = 0; i < query.length; i++) {
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

  return Scanner;
});
