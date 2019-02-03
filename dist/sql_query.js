///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
System.register(['lodash', 'app/core/utils/datemath', 'moment', './scanner'], function(exports_1) {
    var lodash_1, dateMath, moment_1, scanner_1;
    var durationSplitRegexp, SqlQuery;
    return {
        setters:[
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (dateMath_1) {
                dateMath = dateMath_1;
            },
            function (moment_1_1) {
                moment_1 = moment_1_1;
            },
            function (scanner_1_1) {
                scanner_1 = scanner_1_1;
            }],
        execute: function() {
            durationSplitRegexp = /(\d+)(ms|s|m|h|d|w|M|y)/;
            SqlQuery = (function () {
                /** @ngInject */
                function SqlQuery(target, templateSrv, options) {
                    this.target = target;
                    this.templateSrv = templateSrv;
                    this.options = options;
                }
                SqlQuery.prototype.replace = function (options, adhocFilters) {
                    var query = this.templateSrv.replace(this.target.query.trim(), options.scopedVars, SqlQuery.interpolateQueryExpr), scanner = new scanner_1.default(query), dateTimeType = this.target.dateTimeType
                        ? this.target.dateTimeType
                        : 'DATETIME', i = this.templateSrv.replace(this.target.interval, options.scopedVars) || options.interval, interval = SqlQuery.convertInterval(i, this.target.intervalFactor || 1), adhocCondition = [];
                    try {
                        var ast = scanner.toAST();
                        var topQuery = ast;
                        if (adhocFilters.length > 0) {
                            /* Check subqueries for ad-hoc filters */
                            while (!lodash_1.default.isArray(ast.from)) {
                                ast = ast.from;
                            }
                            if (!ast.hasOwnProperty('where')) {
                                ast.where = [];
                            }
                            var target = SqlQuery.target(ast.from[0], this.target);
                            adhocFilters.forEach(function (af) {
                                var parts = af.key.split('.');
                                /* Wildcard table, substitute current target table */
                                if (parts.length == 1) {
                                    parts.unshift(target[1]);
                                }
                                /* Wildcard database, substitute current target database */
                                if (parts.length == 2) {
                                    parts.unshift(target[0]);
                                }
                                /* Expect fully qualified column name at this point */
                                if (parts.length < 3) {
                                    console.warn("adhoc filters: filter " + af.key + "` has wrong format");
                                    return;
                                }
                                if (target[0] != parts[0] || target[1] != parts[1]) {
                                    return;
                                }
                                var operator = SqlQuery.clickhouseOperator(af.operator);
                                var cond = parts[2] + " " + operator + " " + af.value;
                                adhocCondition.push(cond);
                                if (ast.where.length > 0) {
                                    // OR is not implemented
                                    // @see https://github.com/grafana/grafana/issues/10918
                                    cond = "AND " + cond;
                                }
                                ast.where.push(cond);
                            });
                            query = scanner.Print(topQuery);
                        }
                        query = SqlQuery.applyMacros(query, ast);
                    }
                    catch (err) {
                        console.error('AST parser error: ', err);
                    }
                    /* Render the ad-hoc condition or evaluate to an always true condition */
                    var renderedAdHocCondition = '1';
                    if (adhocCondition.length > 0) {
                        renderedAdHocCondition = '(' + adhocCondition.join(' AND ') + ')';
                    }
                    query = SqlQuery.unescape(query);
                    var timeFilter = SqlQuery.getDateTimeFilter(this.options.rangeRaw.to === 'now', dateTimeType);
                    if (typeof this.target.dateColDataType == "string" && this.target.dateColDataType.length > 0) {
                        timeFilter = SqlQuery.getDateFilter(this.options.rangeRaw.to === 'now') + ' AND ' + timeFilter;
                    }
                    this.target.rawQuery = query
                        .replace(/\$timeSeries/g, SqlQuery.getTimeSeries(dateTimeType))
                        .replace(/\$timeFilter/g, timeFilter)
                        .replace(/\$table/g, this.target.database + '.' + this.target.table)
                        .replace(/\$dateCol/g, this.target.dateColDataType)
                        .replace(/\$dateTimeCol/g, this.target.dateTimeColDataType)
                        .replace(/\$interval/g, interval)
                        .replace(/\$adhoc/g, renderedAdHocCondition)
                        .replace(/(?:\r\n|\r|\n)/g, ' ');
                    var round = this.target.round === "$step"
                        ? interval
                        : SqlQuery.convertInterval(this.target.round, 1);
                    this.target.rawQuery = SqlQuery.replaceTimeFilters(this.target.rawQuery, this.options.range, dateTimeType, round);
                    return this.target.rawQuery;
                };
                SqlQuery.replaceTimeFilters = function (query, range, dateTimeType, round) {
                    if (dateTimeType === void 0) { dateTimeType = 'DATETIME'; }
                    var from = SqlQuery.convertTimestamp(SqlQuery.round(range.from, round || 0));
                    var to = SqlQuery.convertTimestamp(SqlQuery.round(range.to, round || 0));
                    // Extend date range to be sure that first and last points
                    // data is not affected by round
                    if (round > 0) {
                        to += (round * 2) - 1;
                        from -= (round * 2) - 1;
                    }
                    return query
                        .replace(/\$timeFilterByColumn\(([\w_]+)\)/g, function (match, columnName) { return (columnName + " " + SqlQuery.getFilterSqlForDateTime(range.raw.to === 'now', dateTimeType)); })
                        .replace(/\$from/g, from.toString())
                        .replace(/\$to/g, to.toString());
                };
                SqlQuery.getFilterSqlForDateTime = function (isToNow, dateTimeType) {
                    var convertFn = this.getConvertFn(dateTimeType);
                    if (isToNow) {
                        return ">= " + convertFn('$from');
                    }
                    return "BETWEEN " + convertFn('$from') + " AND " + convertFn('$to');
                };
                SqlQuery.getConvertFn = function (dateTimeType) {
                    return function (t) {
                        if (dateTimeType === 'DATETIME') {
                            return 'toDateTime(' + t + ')';
                        }
                        return t;
                    };
                };
                SqlQuery.target = function (from, target) {
                    if (from.length == 0) {
                        return ['', ''];
                    }
                    var targetTable, targetDatabase;
                    var parts = from.split('.');
                    switch (parts.length) {
                        case 1:
                            targetTable = parts[0];
                            targetDatabase = target.database;
                            break;
                        case 2:
                            targetDatabase = parts[0];
                            targetTable = parts[1];
                            break;
                        default:
                            throw { message: 'FROM expression "' + from + '" cant be parsed' };
                    }
                    if (targetTable === '$table') {
                        targetTable = target.table;
                    }
                    return [targetDatabase, targetTable];
                };
                SqlQuery.applyMacros = function (query, ast) {
                    if (SqlQuery.contain(ast, '$columns')) {
                        return SqlQuery.columns(query, ast);
                    }
                    if (SqlQuery.contain(ast, '$rateColumns')) {
                        return SqlQuery.rateColumns(query, ast);
                    }
                    if (SqlQuery.contain(ast, '$rate')) {
                        return SqlQuery.rate(query, ast);
                    }
                    if (SqlQuery.contain(ast, '$perSecond')) {
                        return SqlQuery.perSecond(query, ast);
                    }
                    if (SqlQuery.contain(ast, '$perSecondColumns')) {
                        return SqlQuery.perSecondColumns(query, ast);
                    }
                    return query;
                };
                SqlQuery.contain = function (obj, field) {
                    return obj.hasOwnProperty(field) && !lodash_1.default.isEmpty(obj[field]);
                };
                SqlQuery._parseMacros = function (macros, query) {
                    var mLen = macros.length;
                    if (query.slice(0, mLen + 1) !== macros + '(') {
                        return "";
                    }
                    var fromIndex = SqlQuery._fromIndex(query);
                    return query.slice(fromIndex);
                };
                SqlQuery.columns = function (query, ast) {
                    var q = SqlQuery._parseMacros('$columns', query);
                    if (q.length < 1) {
                        return query;
                    }
                    var args = ast['$columns'];
                    if (args.length !== 2) {
                        throw { message: 'Amount of arguments must equal 2 for $columns func. Parsed arguments are: ' + ast.$columns.join(', ') };
                    }
                    return SqlQuery._columns(args[0], args[1], q);
                };
                SqlQuery._columns = function (key, value, fromQuery) {
                    if (key.slice(-1) === ')' || value.slice(-1) === ')') {
                        throw { message: 'Some of passed arguments are without aliases: ' + key + ', ' + value };
                    }
                    var keyAlias = key.trim().split(' ').pop(), valueAlias = value.trim().split(' ').pop(), havingIndex = fromQuery.toLowerCase().indexOf('having'), having = "";
                    if (havingIndex !== -1) {
                        having = ' ' + fromQuery.slice(havingIndex, fromQuery.length);
                        fromQuery = fromQuery.slice(0, havingIndex - 1);
                    }
                    fromQuery = SqlQuery._applyTimeFilter(fromQuery);
                    return 'SELECT' +
                        ' t,' +
                        ' groupArray((' + keyAlias + ', ' + valueAlias + ')) AS groupArr' +
                        ' FROM (' +
                        ' SELECT $timeSeries AS t' +
                        ', ' + key +
                        ', ' + value + ' ' +
                        fromQuery +
                        ' GROUP BY t, ' + keyAlias +
                        having +
                        ' ORDER BY t, ' + keyAlias +
                        ')' +
                        ' GROUP BY t' +
                        ' ORDER BY t';
                };
                SqlQuery.rateColumns = function (query, ast) {
                    var q = SqlQuery._parseMacros('$rateColumns', query);
                    if (q.length < 1) {
                        return query;
                    }
                    var args = ast['$rateColumns'];
                    if (args.length !== 2) {
                        throw { message: 'Amount of arguments must equal 2 for $rateColumns func. Parsed arguments are: ' + args.join(', ') };
                    }
                    query = SqlQuery._columns(args[0], args[1], q);
                    return 'SELECT t' +
                        ', arrayMap(a -> (a.1, a.2/runningDifference( t/1000 )), groupArr)' +
                        ' FROM (' +
                        query +
                        ')';
                };
                SqlQuery._fromIndex = function (query) {
                    var fromIndex = query.toLowerCase().indexOf('from');
                    if (fromIndex === -1) {
                        throw { message: 'Could not find FROM-statement at: ' + query };
                    }
                    return fromIndex;
                };
                SqlQuery.rate = function (query, ast) {
                    var q = SqlQuery._parseMacros('$rate', query);
                    if (q.length < 1) {
                        return query;
                    }
                    var args = ast['$rate'];
                    if (args.length < 1) {
                        throw { message: 'Amount of arguments must be > 0 for $rate func. Parsed arguments are:  ' + args.join(', ') };
                    }
                    return SqlQuery._rate(args, q);
                };
                SqlQuery._rate = function (args, fromQuery) {
                    var aliases = [];
                    lodash_1.default.each(args, function (arg) {
                        if (arg.slice(-1) === ')') {
                            throw { message: 'Argument "' + arg + '" cant be used without alias' };
                        }
                        aliases.push(arg.trim().split(' ').pop());
                    });
                    var cols = [];
                    lodash_1.default.each(aliases, function (a) {
                        cols.push(a + '/runningDifference(t/1000) ' + a + 'Rate');
                    });
                    fromQuery = SqlQuery._applyTimeFilter(fromQuery);
                    return 'SELECT ' +
                        't,' +
                        ' ' + cols.join(', ') +
                        ' FROM (' +
                        ' SELECT $timeSeries AS t' +
                        ', ' + args.join(', ') +
                        ' ' + fromQuery +
                        ' GROUP BY t' +
                        ' ORDER BY t' +
                        ')';
                };
                SqlQuery.perSecondColumns = function (query, ast) {
                    var q = SqlQuery._parseMacros('$perSecondColumns', query);
                    if (q.length < 1) {
                        return query;
                    }
                    var args = ast['$perSecondColumns'];
                    if (args.length !== 2) {
                        throw { message: 'Amount of arguments must equal 2 for $perSecondColumns func. Parsed arguments are: ' + args.join(', ') };
                    }
                    var key = args[0], value = 'max(' + args[1].trim() + ') AS max_0', havingIndex = q.toLowerCase().indexOf('having'), having = "";
                    if (havingIndex !== -1) {
                        having = ' ' + q.slice(havingIndex, q.length);
                        q = q.slice(0, havingIndex - 1);
                    }
                    q = SqlQuery._applyTimeFilter(q);
                    return 'SELECT' +
                        ' t,' +
                        ' groupArray((' + key + ', max_0_Rate)) AS groupArr' +
                        ' FROM (' +
                        ' SELECT t,' +
                        ' ' + key +
                        ', if(runningDifference(max_0) < 0, nan, runningDifference(max_0) / runningDifference(t/1000)) AS max_0_Rate' +
                        ' FROM (' +
                        ' SELECT $timeSeries AS t' +
                        ', ' + key +
                        ', ' + value + ' ' +
                        q +
                        ' GROUP BY t, ' + key +
                        having +
                        ' ORDER BY ' + key + ', t' +
                        ')' +
                        ')' +
                        ' GROUP BY t' +
                        ' ORDER BY t';
                    return SqlQuery._perSecond(args, q);
                };
                // $perSecond(query)
                SqlQuery.perSecond = function (query, ast) {
                    var q = SqlQuery._parseMacros('$perSecond', query);
                    if (q.length < 1) {
                        return query;
                    }
                    var args = ast['$perSecond'];
                    if (args.length < 1) {
                        throw { message: 'Amount of arguments must be > 0 for $perSecond func. Parsed arguments are:  ' + args.join(', ') };
                    }
                    lodash_1.default.each(args, function (a, i) {
                        args[i] = 'max(' + a.trim() + ') AS max_' + i;
                    });
                    return SqlQuery._perSecond(args, q);
                };
                SqlQuery._perSecond = function (args, fromQuery) {
                    var cols = [];
                    lodash_1.default.each(args, function (a, i) {
                        cols.push('if(runningDifference(max_' + i + ') < 0, nan, ' +
                            'runningDifference(max_' + i + ') / runningDifference(t/1000)) AS max_' + i + '_Rate');
                    });
                    fromQuery = SqlQuery._applyTimeFilter(fromQuery);
                    return 'SELECT ' +
                        't,' +
                        ' ' + cols.join(', ') +
                        ' FROM (' +
                        ' SELECT $timeSeries AS t,' +
                        ' ' + args.join(', ') +
                        ' ' + fromQuery +
                        ' GROUP BY t' +
                        ' ORDER BY t' +
                        ')';
                };
                SqlQuery._applyTimeFilter = function (query) {
                    if (query.toLowerCase().indexOf('where') !== -1) {
                        query = query.replace(/where/i, 'WHERE $timeFilter AND');
                    }
                    else {
                        query += ' WHERE $timeFilter';
                    }
                    return query;
                };
                SqlQuery.getTimeSeries = function (dateTimeType) {
                    if (dateTimeType === 'DATETIME') {
                        return '(intDiv(toUInt32($dateTimeCol), $interval) * $interval) * 1000';
                    }
                    return '(intDiv($dateTimeCol, $interval) * $interval) * 1000';
                };
                SqlQuery.getDateFilter = function (isToNow) {
                    if (isToNow) {
                        return '$dateCol >= toDate($from)';
                    }
                    return '$dateCol BETWEEN toDate($from) AND toDate($to)';
                };
                SqlQuery.getDateTimeFilter = function (isToNow, dateTimeType) {
                    var convertFn = function (t) {
                        if (dateTimeType === 'DATETIME') {
                            return 'toDateTime(' + t + ')';
                        }
                        return t;
                    };
                    if (isToNow) {
                        return '$dateTimeCol >= ' + convertFn('$from');
                    }
                    return '$dateTimeCol BETWEEN ' + convertFn('$from') + ' AND ' + convertFn('$to');
                };
                // date is a moment object
                SqlQuery.convertTimestamp = function (date) {
                    //return date.format("'Y-MM-DD HH:mm:ss'")
                    if (lodash_1.default.isString(date)) {
                        date = dateMath.parse(date, true);
                    }
                    return Math.floor(date.valueOf() / 1000);
                };
                SqlQuery.round = function (date, round) {
                    if (round == 0) {
                        return date;
                    }
                    if (lodash_1.default.isString(date)) {
                        date = dateMath.parse(date, true);
                    }
                    var coeff = 1000 * round;
                    var rounded = Math.floor(date.valueOf() / coeff) * coeff;
                    return moment_1.default(rounded);
                };
                SqlQuery.convertInterval = function (interval, intervalFactor) {
                    if (interval === undefined || typeof interval !== 'string' || interval == "") {
                        return 0;
                    }
                    var m = interval.match(durationSplitRegexp);
                    if (m === null) {
                        throw { message: 'Received interval is invalid: ' + interval };
                    }
                    var dur = moment_1.default.duration(parseInt(m[1]), m[2]);
                    var sec = dur.asSeconds();
                    if (sec < 1) {
                        sec = 1;
                    }
                    return Math.ceil(sec * intervalFactor);
                };
                SqlQuery.interpolateQueryExpr = function (value, variable, defaultFormatFn) {
                    // if no `multiselect` or `include all` - do not escape
                    if (!variable.multi && !variable.includeAll) {
                        return value;
                    }
                    if (typeof value === 'string') {
                        return SqlQuery.clickhouseEscape(value, variable);
                    }
                    var escapedValues = lodash_1.default.map(value, function (v) {
                        return SqlQuery.clickhouseEscape(v, variable);
                    });
                    return escapedValues.join(',');
                };
                SqlQuery.clickhouseOperator = function (value) {
                    switch (value) {
                        case "=":
                        case "!=":
                        case ">":
                        case "<":
                            return value;
                        case "=~":
                            return "LIKE";
                        case "!~":
                            return "NOT LIKE";
                        default:
                            console.warn("adhoc filters: got unsupported operator `" + value + "`");
                            return value;
                    }
                };
                SqlQuery.clickhouseEscape = function (value, variable) {
                    var isDigit = true;
                    // if at least one of options is not digit
                    lodash_1.default.each(variable.options, function (opt) {
                        if (opt.value === '$__all') {
                            return true;
                        }
                        if (!opt.value.match(/^\d+$/)) {
                            isDigit = false;
                            return false;
                        }
                        return true;
                    });
                    if (isDigit) {
                        return value;
                    }
                    else {
                        return "'" + value.replace(/[\\']/g, '\\$&') + "'";
                    }
                };
                SqlQuery.unescape = function (query) {
                    var macros = '$unescape(';
                    var openMacros = query.indexOf(macros);
                    while (openMacros !== -1) {
                        var r = SqlQuery.betweenBraces(query.substring(openMacros + macros.length, query.length));
                        if (r.error.length > 0) {
                            throw { message: '$unescape macros error: ' + r.error };
                        }
                        var arg = r.result;
                        arg = arg.replace(/[']+/g, '');
                        var closeMacros = openMacros + macros.length + r.result.length + 1;
                        query = query.substring(0, openMacros) + arg + query.substring(closeMacros, query.length);
                        openMacros = query.indexOf('$unescape(');
                    }
                    return query;
                };
                SqlQuery.betweenBraces = function (query) {
                    var r = {
                        result: "",
                        error: "",
                    };
                    var openBraces = 1;
                    for (var i = 0; i < query.length; i++) {
                        if (query.charAt(i) === '(') {
                            openBraces++;
                        }
                        if (query.charAt(i) === ')') {
                            openBraces--;
                            if (openBraces === 0) {
                                r.result = query.substring(0, i);
                                break;
                            }
                        }
                    }
                    if (openBraces > 1) {
                        r.error = "missing parentheses";
                    }
                    return r;
                };
                return SqlQuery;
            })();
            exports_1("default", SqlQuery);
        }
    }
});
//# sourceMappingURL=sql_query.js.map