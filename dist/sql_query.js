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
                    var self = this, query = this.target.query, scanner = new scanner_1.default(query), dateTimeType = this.target.dateTimeType ? this.target.dateTimeType : 'DATETIME', i = this.templateSrv.replace(this.target.interval, options.scopedVars) || options.interval, interval = SqlQuery.convertInterval(i, this.target.intervalFactor || 1), round = this.target.round === "$step" ? interval : SqlQuery.convertInterval(this.target.round, 1), from = SqlQuery.convertTimestamp(SqlQuery.round(this.options.range.from, round)), to = SqlQuery.convertTimestamp(SqlQuery.round(this.options.range.to, round)), timeSeries = SqlQuery.getTimeSeries(dateTimeType), timeFilter = SqlQuery.getTimeFilter(this.options.rangeRaw.to === 'now', dateTimeType), adhocCondition = [];
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
                            adhocFilters.forEach(function (af) {
                                var parts = af.key.split('.');
                                /* Wildcard table, substitute current target table */
                                if (parts.length == 1) {
                                    parts.unshift(self.target.table);
                                }
                                /* Wildcard database, substitute current target database */
                                if (parts.length == 2) {
                                    parts.unshift(self.target.database);
                                }
                                /* Expect fully qualified column name at this point */
                                if (parts.length < 3) {
                                    console.log("adhoc filters: filter " + af.key + "` has wrong format");
                                    return;
                                }
                                if (self.target.database != parts[0] || self.target.table != parts[1]) {
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
                        if (ast.hasOwnProperty('$columns') && !lodash_1.default.isEmpty(ast['$columns'])) {
                            query = SqlQuery.columns(query);
                        }
                        else if (ast.hasOwnProperty('$rateColumns') && !lodash_1.default.isEmpty(ast['$rateColumns'])) {
                            query = SqlQuery.rateColumns(query);
                        }
                        else if (ast.hasOwnProperty('$rate') && !lodash_1.default.isEmpty(ast['$rate'])) {
                            query = SqlQuery.rate(query, ast);
                        }
                    }
                    catch (err) {
                        console.log('AST parser error: ', err);
                    }
                    /* Render the ad-hoc condition or evaluate to an always true condition */
                    var renderedAdHocCondition = '1';
                    if (adhocCondition.length > 0) {
                        renderedAdHocCondition = '(' + adhocCondition.join(' AND ') + ')';
                    }
                    query = this.templateSrv.replace(query, options.scopedVars, SqlQuery.interpolateQueryExpr);
                    query = SqlQuery.unescape(query);
                    this.target.rawQuery = query
                        .replace(/\$timeSeries/g, timeSeries)
                        .replace(/\$timeFilter/g, timeFilter)
                        .replace(/\$table/g, this.target.database + '.' + this.target.table)
                        .replace(/\$from/g, from)
                        .replace(/\$to/g, to)
                        .replace(/\$dateCol/g, this.target.dateColDataType)
                        .replace(/\$dateTimeCol/g, this.target.dateTimeColDataType)
                        .replace(/\$interval/g, interval)
                        .replace(/\$adhoc/g, renderedAdHocCondition)
                        .replace(/(?:\r\n|\r|\n)/g, ' ');
                    return this.target.rawQuery;
                };
                // $columns(query)
                SqlQuery.columns = function (query) {
                    if (query.slice(0, 9) === '$columns(') {
                        var fromIndex = SqlQuery._fromIndex(query);
                        var args = query.slice(9, fromIndex)
                            .trim() // rm spaces
                            .slice(0, -1), // cut ending brace
                        scanner = new scanner_1.default(args), ast = scanner.toAST();
                        var root = ast['root'];
                        if (root.length !== 2) {
                            throw { message: 'Amount of arguments must equal 2 for $columns func. Parsed arguments are: ' + root.join(', ') };
                        }
                        query = SqlQuery._columns(root[0], root[1], query.slice(fromIndex));
                    }
                    return query;
                };
                SqlQuery._columns = function (key, value, fromQuery) {
                    if (key.slice(-1) === ')' || value.slice(-1) === ')') {
                        throw { message: 'Some of passed arguments are without aliases: ' + key + ', ' + value };
                    }
                    var keyAlias = key.trim().split(' ').pop(), valueAlias = value.trim().split(' ').pop(), havingIndex = fromQuery.toLowerCase().indexOf('having'), having = "";
                    if (havingIndex !== -1) {
                        having = fromQuery.slice(havingIndex, fromQuery.length);
                        fromQuery = fromQuery.slice(0, havingIndex);
                    }
                    fromQuery = SqlQuery._applyTimeFilter(fromQuery);
                    return 'SELECT ' +
                        't' +
                        ', groupArray((' + keyAlias + ', ' + valueAlias + ')) as groupArr' +
                        ' FROM (' +
                        ' SELECT $timeSeries as t' +
                        ', ' + key +
                        ', ' + value + ' ' +
                        fromQuery +
                        ' GROUP BY t, ' + keyAlias +
                        ' ' + having +
                        ' ORDER BY t, ' + keyAlias +
                        ') ' +
                        'GROUP BY t ' +
                        'ORDER BY t';
                };
                // $rateColumns(query)
                SqlQuery.rateColumns = function (query) {
                    if (query.slice(0, 13) === '$rateColumns(') {
                        var fromIndex = SqlQuery._fromIndex(query);
                        var args = query.slice(13, fromIndex)
                            .trim() // rm spaces
                            .slice(0, -1), // cut ending brace
                        scanner = new scanner_1.default(args), ast = scanner.toAST();
                        var root = ast['root'];
                        if (root.length !== 2) {
                            throw { message: 'Amount of arguments must equal 2 for $columns func. Parsed arguments are: ' + root.join(', ') };
                        }
                        query = SqlQuery._columns(root[0], root[1], query.slice(fromIndex));
                        query = 'SELECT t' +
                            ', arrayMap(a -> (a.1, a.2/runningDifference( t/1000 )), groupArr)' +
                            ' FROM (' +
                            query +
                            ')';
                    }
                    return query;
                };
                // $rate(query)
                SqlQuery.rate = function (query, ast) {
                    if (query.slice(0, 6) === '$rate(') {
                        var fromIndex = SqlQuery._fromIndex(query);
                        if (ast.$rate.length < 1) {
                            throw { message: 'Amount of arguments must be > 0 for $rate func. Parsed arguments are: ' + ast.$rate.join(', ') };
                        }
                        query = SqlQuery._rate(ast['$rate'], query.slice(fromIndex));
                    }
                    return query;
                };
                SqlQuery._fromIndex = function (query) {
                    var fromIndex = query.toLowerCase().indexOf('from');
                    if (fromIndex === -1) {
                        throw { message: 'Could not find FROM-statement at: ' + query };
                    }
                    return fromIndex;
                };
                SqlQuery._rate = function (args, fromQuery) {
                    var aliases = [];
                    lodash_1.default.each(args, function (arg) {
                        if (arg.slice(-1) === ')') {
                            throw { message: 'Argument "' + arg + '" cant be used without alias' };
                        }
                        aliases.push(arg.trim().split(' ').pop());
                    });
                    var rateColums = [];
                    lodash_1.default.each(aliases, function (a) {
                        rateColums.push(a + '/runningDifference(t/1000) ' + a + 'Rate');
                    });
                    fromQuery = SqlQuery._applyTimeFilter(fromQuery);
                    return 'SELECT ' + '' +
                        't' +
                        ', ' + rateColums.join(',') +
                        ' FROM (' +
                        ' SELECT $timeSeries as t' +
                        ', ' + args.join(',') +
                        ' ' + fromQuery +
                        ' GROUP BY t' +
                        ' ORDER BY t' +
                        ')';
                };
                SqlQuery._applyTimeFilter = function (query) {
                    if (query.toLowerCase().indexOf('where') !== -1) {
                        query = query.replace(/where/i, 'WHERE $timeFilter AND ');
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
                SqlQuery.getTimeFilter = function (isToNow, dateTimeType) {
                    var convertFn = function (t) {
                        if (dateTimeType === 'DATETIME') {
                            return 'toDateTime(' + t + ')';
                        }
                        return t;
                    };
                    if (isToNow) {
                        return '$dateCol >= toDate($from) AND $dateTimeCol >= ' + convertFn('$from');
                    }
                    return '$dateCol BETWEEN toDate($from) AND toDate($to) AND $dateTimeCol BETWEEN ' + convertFn('$from') + ' AND ' + convertFn('$to');
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
                            console.log("adhoc filters: got unsupported operator `" + value + "`");
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
                        var closeMacros = query.indexOf(')', openMacros);
                        if (closeMacros === -1) {
                            throw { message: 'unable to find closing brace for $unescape macros: ' + query.substring(0, openMacros) };
                        }
                        var arg = query.substring(openMacros + macros.length, closeMacros)
                            .trim();
                        arg = arg.replace(/[']+/g, '');
                        query = query.substring(0, openMacros) + arg + query.substring(closeMacros + 1, query.length);
                        openMacros = query.indexOf('$unescape(');
                    }
                    return query;
                };
                return SqlQuery;
            })();
            exports_1("default", SqlQuery);
        }
    }
});
//# sourceMappingURL=sql_query.js.map