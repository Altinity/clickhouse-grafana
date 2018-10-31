System.register(['lodash'], function(exports_1) {
    var lodash_1;
    var Scanner, wsRe, commentRe, idRe, intRe, powerIntRe, floatRe, stringRe, binaryOpRe, statementRe, joinsRe, macroFuncRe, condRe, inRe, closureRe, specCharsRe, macroRe, skipSpaceRe, builtInFuncRe, operatorRe, dataTypeRe, wsOnlyRe, commentOnlyRe, idOnlyRe, closureOnlyRe, macroFuncOnlyRe, statementOnlyRe, joinsOnlyRe, operatorOnlyRe, dataTypeOnlyRe, builtInFuncOnlyRe, macroOnlyRe, inOnlyRe, condOnlyRe, numOnlyRe, stringOnlyRe, skipSpaceOnlyRe, binaryOnlyRe, tokenRe, tabSize, newLine;
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
    function printItems(items, tab, separator) {
        if (tab === void 0) { tab = ''; }
        if (separator === void 0) { separator = ''; }
        var result = '';
        if (lodash_1.default.isArray(items)) {
            if (items.length === 1) {
                result += ' ' + items[0];
            }
            else {
                result += newLine;
                items.forEach(function (item, i) {
                    result += tab + tabSize + item;
                    if (i !== items.length - 1) {
                        result += separator;
                        result += newLine;
                    }
                });
            }
        }
        else {
            result = newLine + '(' + newLine + print(items, tab + tabSize) + newLine + ')';
        }
        return result;
    }
    function toAST(s) {
        var scanner = new Scanner(s);
        return scanner.toAST();
    }
    function isSet(obj, prop) {
        return obj.hasOwnProperty(prop) && !lodash_1.default.isEmpty(obj[prop]);
    }
    function isClosured(argument) {
        return (argument.match(/\(/g) || []).length === (argument.match(/\)/g) || []).length;
    }
    function betweenBraces(query) {
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
    // see https://clickhouse.yandex/reference_ru.html#SELECT
    function print(AST, tab) {
        if (tab === void 0) { tab = ''; }
        var result = '';
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
        if (isSet(AST, '$columns')) {
            result += tab + '$columns(';
            result += printItems(AST.$columns, tab, ',') + ')';
        }
        if (isSet(AST, '$rateColumns')) {
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
            result += tab + newLine + AST.join.type.toUpperCase() +
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
    return {
        setters:[
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            }],
        execute: function() {
            Scanner = (function () {
                /** @ngInject */
                function Scanner(s) {
                    this._sOriginal = s;
                    this.token = null;
                }
                Scanner.prototype.raw = function () {
                    return this._sOriginal;
                };
                Scanner.prototype.expect = function (token) {
                    this.expectNext();
                    if (!this.isToken(token)) {
                        throw ("expecting [" + token + "], but got [" + this.token + "] at [" + this._s + "]");
                    }
                };
                Scanner.prototype.isToken = function (token) {
                    return lodash_1.default.toUpper(token) === lodash_1.default.toUpper(this.token);
                };
                Scanner.prototype.expectNext = function () {
                    if (!this.next()) {
                        throw ("expecting additional token at the end of query [" + this._sOriginal + "]");
                    }
                };
                Scanner.prototype.next = function () {
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
                Scanner.prototype._next = function () {
                    if (this._s.length === 0) {
                        return false;
                    }
                    var r = this.re.exec(this._s);
                    if (r === null) {
                        throw ("cannot find next token in [" + this._s + "]");
                    }
                    this.token = r[0];
                    this._s = this._s.substring(this.token.length);
                    return true;
                };
                Scanner.prototype.Format = function () {
                    return print(this.toAST());
                };
                Scanner.prototype.Print = function (ast) {
                    return print(ast);
                };
                Scanner.prototype.push = function (argument) {
                    this.tree[this.rootToken].push(argument);
                    this.expectedNext = false;
                };
                Scanner.prototype.setRoot = function (token) {
                    this.rootToken = token.toLowerCase();
                    this.tree[this.rootToken] = [];
                    this.expectedNext = true;
                };
                Scanner.prototype.isExpectedNext = function () {
                    var v = this.expectedNext;
                    this.expectedNext = false;
                    return v;
                };
                Scanner.prototype.appendToken = function (argument) {
                    return (argument === '' || isSkipSpace(argument[argument.length - 1]))
                        ? this.token
                        : ' ' + this.token;
                };
                Scanner.prototype.toAST = function () {
                    this._s = this._sOriginal;
                    this.tree = {};
                    this.setRoot('root');
                    this.expectedNext = false;
                    this.skipSpace = true;
                    this.re = new RegExp("^(?:" + tokenRe + ")", 'i');
                    var subQuery = '', argument = '';
                    while (this.next()) {
                        if (!this.isExpectedNext() && isStatement(this.token) && !this.tree.hasOwnProperty(lodash_1.default.toLower(this.token))) {
                            if (!isClosured(argument)) {
                                argument += this.appendToken(argument);
                                continue;
                            }
                            if (argument.length > 0) {
                                this.push(argument);
                                argument = '';
                            }
                            this.setRoot(this.token);
                        }
                        else if (this.token === ',' && isClosured(argument)) {
                            this.push(argument);
                            argument = '';
                            this.expectedNext = true;
                        }
                        else if (isClosureChars(this.token) && this.rootToken === 'from') {
                            subQuery = betweenBraces(this._s);
                            this.tree[this.rootToken] = toAST(subQuery);
                            this._s = this._s.substring(subQuery.length + 1);
                        }
                        else if (isMacroFunc(this.token)) {
                            var func = this.token;
                            if (!this.next()) {
                                throw ("wrong function signature for `" + func + "` at [" + this._s + "]");
                            }
                            subQuery = betweenBraces(this._s);
                            var subAST = toAST(subQuery);
                            if (isSet(subAST, 'root')) {
                                this.tree[func] = subAST['root'].map(function (item) {
                                    return item;
                                });
                            }
                            else {
                                this.tree[func] = subAST;
                            }
                            this._s = this._s.substring(subQuery.length + 1);
                            // macro funcs are used instead of SELECT statement
                            this.tree['select'] = [];
                        }
                        else if (isIn(this.token)) {
                            argument += ' ' + this.token;
                            if (!this.next()) {
                                throw ("wrong in signature for `" + argument + "` at [" + this._s + "]");
                            }
                            if (isClosureChars(this.token)) {
                                subQuery = betweenBraces(this._s);
                                var subAST = toAST(subQuery);
                                if (isSet(subAST, 'root')) {
                                    argument += ' (' + subAST['root'].map(function (item) {
                                        return item;
                                    });
                                    argument = argument + ')';
                                }
                                else {
                                    argument += ' (' + newLine + print(subAST, tabSize) + ')';
                                    this.push(argument);
                                    argument = '';
                                }
                                this._s = this._s.substring(subQuery.length + 1);
                            }
                            else {
                                argument += ' ' + this.token;
                            }
                        }
                        else if (isCond(this.token) && (this.rootToken === 'where' || this.rootToken === 'prewhere')) {
                            if (isClosured(argument)) {
                                this.push(argument);
                                argument = this.token;
                            }
                            else {
                                argument += ' ' + this.token;
                            }
                        }
                        else if (isJoin(this.token)) {
                            var joinType = this.token, source = void 0;
                            if (!this.next()) {
                                throw ("wrong join signature for `" + joinType + "` at [" + this._s + "]");
                            }
                            if (isClosureChars(this.token)) {
                                subQuery = betweenBraces(this._s);
                                source = toAST(subQuery);
                                this._s = this._s.substring(subQuery.length + 1);
                            }
                            else {
                                source = [this.token];
                            }
                            this.expect('using');
                            this.tree['join'] = { type: joinType, source: source, using: [] };
                            while (this.next()) {
                                if (isStatement(this.token)) {
                                    if (argument !== '') {
                                        this.push(argument);
                                        argument = '';
                                    }
                                    this.setRoot(this.token);
                                    break;
                                }
                                if (!isID(this.token)) {
                                    continue;
                                }
                                this.tree['join'].using.push(this.token);
                            }
                        }
                        else if (this.rootToken === 'union all') {
                            var statement = 'union all';
                            this._s = this.token + ' ' + this._s;
                            var subQueryPos = this._s.toLowerCase().indexOf(statement);
                            while (subQueryPos !== -1) {
                                var subQuery_1 = this._s.substring(0, subQueryPos);
                                var ast_1 = toAST(subQuery_1);
                                this.tree[statement].push(ast_1);
                                this._s = this._s.substring(subQueryPos + statement.length, this._s.length);
                                subQueryPos = this._s.toLowerCase().indexOf(statement);
                            }
                            var ast = toAST(this._s);
                            this._s = '';
                            this.tree[statement].push(ast);
                        }
                        else if (isClosureChars(this.token) || this.token === '.') {
                            argument += this.token;
                        }
                        else if (this.token === ',') {
                            argument += this.token + ' ';
                        }
                        else {
                            argument += this.appendToken(argument);
                        }
                    }
                    if (argument !== '') {
                        this.push(argument);
                    }
                    return this.tree;
                };
                return Scanner;
            })();
            exports_1("default", Scanner);
            wsRe = "\\s+", commentRe = "--[^\n]*|/\\*(?:[^*]|\\*[^/])*\\*/", idRe = "[a-zA-Z_][a-zA-Z_0-9]*", intRe = "\\d+", powerIntRe = "\\d+e\\d+", floatRe = "\\d+\\.\\d*|\\d*\\.\\d+|\\d+[eE][-+]\\d+", stringRe = "('[^']*')|(`[^`]*`)", binaryOpRe = "=>|\\|\\||>=|<=|==|!=|<>|->|[-+/%*=<>\\.!]", statementRe = "\\b(select|from|where|having|order by|group by|limit|format|prewhere|union all)\\b", joinsRe = "(any inner join|any left join|all inner join|all left join" +
                "|global any inner join|global any left join|global all inner join|global all left join)", macroFuncRe = "(\\$rateColumns|\\$perSecondColumns|\\$rate|\\$perSecond|\\$columns)", condRe = "\\b(or|and)\\b", inRe = "\\b(global in|global not in|not in|in)\\b", closureRe = "[\\(\\)\\[\\]]", specCharsRe = "[,?:]", macroRe = "\\$[A-Za-z0-9_$]+", skipSpaceRe = "[\\(\\.! \\[]", builtInFuncRe = "\\b(avg|countIf|first|last|max|min|sum|sumIf|ucase|lcase|mid|round|rank|now|" +
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
                "covarSamp|covarPop|corr|sequenceMatch|sequenceCount|uniqUpTo|avgIf|" +
                "quantilesTimingIf|argMinIf|uniqArray|sumArray|quantilesTimingArrayIf|uniqArrayIf|medianIf|" +
                "quantilesIf|varSampIf|varPopIf|stddevSampIf|stddevPopIf|covarSampIf|covarPopIf|corrIf|" +
                "uniqArrayIf|sumArrayIf|uniq)\\b", operatorRe = "\\b(select|group by|order by|from|where|limit|offset|having|as|" +
                "when|else|end|type|left|right|on|outer|desc|asc|primary|key|between|" +
                "foreign|not|null|inner|cross|natural|database|prewhere|using|global|in)\\b", dataTypeRe = "\\b(int|numeric|decimal|date|varchar|char|bigint|float|double|bit|binary|text|set|timestamp|" +
                "money|real|number|integer|" +
                "uint8|uint16|uint32|uint64|int8|int16|int32|int64|float32|float64|datetime|enum8|enum16|" +
                "array|tuple|string)\\b", wsOnlyRe = new RegExp("^(?:" + wsRe + ")$"), commentOnlyRe = new RegExp("^(?:" + commentRe + ")$"), idOnlyRe = new RegExp("^(?:" + idRe + ")$"), closureOnlyRe = new RegExp("^(?:" + closureRe + ")$"), macroFuncOnlyRe = new RegExp("^(?:" + macroFuncRe + ")$"), statementOnlyRe = new RegExp("^(?:" + statementRe + ")$", 'i'), joinsOnlyRe = new RegExp("^(?:" + joinsRe + ")$", 'i'), operatorOnlyRe = new RegExp("^(?:" + operatorRe + ")$", 'i'), dataTypeOnlyRe = new RegExp("^(?:" + dataTypeRe + ")$"), builtInFuncOnlyRe = new RegExp("^(?:" + builtInFuncRe + ")$"), macroOnlyRe = new RegExp("^(?:" + macroRe + ")$", 'i'), inOnlyRe = new RegExp("^(?:" + inRe + ")$", 'i'), condOnlyRe = new RegExp("^(?:" + condRe + ")$", 'i'), numOnlyRe = new RegExp("^(?:" + [powerIntRe, intRe, floatRe].join("|") + ")$"), stringOnlyRe = new RegExp("^(?:" + stringRe + ")$"), skipSpaceOnlyRe = new RegExp("^(?:" + skipSpaceRe + ")$"), binaryOnlyRe = new RegExp("^(?:" + binaryOpRe + ")$");
            tokenRe = [statementRe, macroFuncRe, joinsRe, inRe, wsRe, commentRe, idRe, stringRe, powerIntRe, floatRe, intRe,
                binaryOpRe, closureRe, specCharsRe, macroRe].join("|");
            tabSize = '    ', newLine = '\n';
        }
    }
});
//# sourceMappingURL=scanner.js.map