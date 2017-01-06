///<reference path="app/headers/common.d.ts" />
System.register(['lodash', './query_part', 'app/core/utils/datemath'], function(exports_1) {
    var lodash_1, query_part_1, dateMath;
    var SqlQuery;
    return {
        setters:[
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (query_part_1_1) {
                query_part_1 = query_part_1_1;
            },
            function (dateMath_1) {
                dateMath = dateMath_1;
            }],
        execute: function() {
            SqlQuery = (function () {
                /** @ngInject */
                function SqlQuery(target, templateSrv, options) {
                    this.target = target;
                    this.templateSrv = templateSrv;
                    this.options = options;
                    target.resultFormat = 'time_series';
                    target.tags = target.tags || [];
                    target.targetLists = target.targetLists || [[
                            { type: 'field', params: ['*'] },
                            { type: 'count', params: [] },
                        ]];
                    this.updateProjection();
                }
                SqlQuery.prototype.updateProjection = function () {
                    this.selectModels = lodash_1.default.map(this.target.targetLists, function (parts) {
                        return lodash_1.default.map(parts, query_part_1.default.create);
                    });
                };
                SqlQuery.prototype.updatePersistedParts = function () {
                    this.target.targetLists = lodash_1.default.map(this.selectModels, function (selectParts) {
                        return lodash_1.default.map(selectParts, function (part) {
                            return { type: part.def.type, params: part.params };
                        });
                    });
                };
                SqlQuery.prototype.removeSelect = function (index) {
                    this.target.targetLists.splice(index, 1);
                    this.updateProjection();
                };
                SqlQuery.prototype.removeSelectPart = function (selectParts, part) {
                    // if we remove the field remove the whole statement
                    if (part.def.type === 'field') {
                        if (this.selectModels.length > 1) {
                            var modelsIndex = lodash_1.default.indexOf(this.selectModels, selectParts);
                            this.selectModels.splice(modelsIndex, 1);
                        }
                    }
                    else {
                        var partIndex = lodash_1.default.indexOf(selectParts, part);
                        selectParts.splice(partIndex, 1);
                    }
                    this.updatePersistedParts();
                };
                SqlQuery.prototype.addSelectPart = function (selectParts, type) {
                    var partModel = query_part_1.default.create({ type: type });
                    partModel.def.addStrategy(selectParts, partModel, this);
                    this.updatePersistedParts();
                };
                SqlQuery.renderTagCondition = function (tag, index) {
                    var str = "";
                    var operator = tag.operator;
                    var value = tag.value;
                    if (index > 0) {
                        str = (tag.condition || 'AND') + ' ';
                    }
                    if (!operator) {
                        if (/^\/.*\/$/.test(value)) {
                            operator = '=~';
                        }
                        else {
                            operator = '=';
                        }
                    }
                    return str + tag.key + ' ' + operator + ' ' + value;
                };
                SqlQuery.prototype.getTableAndDatabase = function () {
                    var database = this.target.database;
                    var table = this.target.table || 'table';
                    if (database !== 'default') {
                        database = this.target.database + '.';
                    }
                    else {
                        database = "";
                    }
                    return database + table;
                };
                SqlQuery.prototype.render = function (rebuild) {
                    var target = this.target;
                    if (target.rawQuery && !rebuild) {
                        return target.query;
                    }
                    var query = 'SELECT $timeSeries as t, ', i, j, targetList = '';
                    for (i = 0; i < this.selectModels.length; i++) {
                        var parts = this.selectModels[i];
                        var selectText = "";
                        for (j = 0; j < parts.length; j++) {
                            var part = parts[j];
                            selectText = part.render(selectText);
                        }
                        if (i > 0) {
                            targetList += ', ';
                        }
                        targetList += selectText;
                    }
                    query += targetList;
                    query += ' FROM ' + this.getTableAndDatabase() + ' WHERE ';
                    var conditions = lodash_1.default.map(target.tags, function (tag, index) {
                        return SqlQuery.renderTagCondition(tag, index);
                    });
                    query += conditions.join(' ');
                    query += (conditions.length > 0 ? ' AND ' : '') + '$timeFilter';
                    query += ' GROUP BY t ORDER BY t';
                    return query.trim();
                };
                SqlQuery.prototype.replace = function (options) {
                    var query = this.render(false), 
                    // hack to query additional left data-point
                    from = SqlQuery.convertTimestamp(this.options.range.from
                        .subtract(this.options.intervalMs > 60000 ? this.options.intervalMs : 60000, 'ms')), to = SqlQuery.convertTimestamp(this.options.range.to), timeFilter = SqlQuery.getTimeFilter((this.options.rangeRaw.to === 'now')), interval = SqlQuery.convertInterval(this.options.intervalMs);
                    query = SqlQuery.columns(query);
                    query = SqlQuery.rateColumns(query);
                    query = SqlQuery.rate(query);
                    query = this.templateSrv.replace(query, options.scopedVars);
                    this.target.compiledQuery = query
                        .replace(/\$timeSeries/g, '(intDiv(toUInt32($dateTimeCol), $interval) * $interval) * 1000')
                        .replace(/\$timeFilter/g, timeFilter)
                        .replace(/\$from/g, from)
                        .replace(/\$to/g, to)
                        .replace(/\$timeCol/g, this.target.dateColDataType)
                        .replace(/\$dateTimeCol/g, this.target.dateTimeColDataType)
                        .replace(/\$interval/g, interval);
                    return this.target.compiledQuery;
                };
                // $columns(query)
                SqlQuery.columns = function (query) {
                    if (query.slice(0, 9) == '$columns(') {
                        var fromIndex = SqlQuery._fromIndex(query);
                        var args = query.slice(9, fromIndex)
                            .trim() // rm spaces
                            .slice(0, -1) // cut ending brace
                            .split(','); // extract arguments
                        if (args.length != 2) {
                            throw { message: 'Amount of arguments must equal 2 for $columns func. Parsed arguments are: ' + args.join(', ') };
                        }
                        query = SqlQuery._columns(args[0], args[1], query.slice(fromIndex));
                    }
                    return query;
                };
                SqlQuery._columns = function (key, value, fromQuery) {
                    if (key.slice(-1) == ')' || value.slice(-1) == ')') {
                        throw { message: 'Some of passed arguments are without aliases: ' + key + ', ' + value };
                    }
                    var keyAlias = key.trim().split(' ').pop(), valueAlias = value.trim().split(' ').pop();
                    fromQuery = SqlQuery._applyTimeFilter(fromQuery);
                    return 'SELECT ' + '' +
                        't' +
                        ', groupArray((' + keyAlias + ', ' + valueAlias + ')) as groupArr' +
                        ' FROM (' +
                        ' SELECT $timeSeries as t' +
                        ', ' + key +
                        ', ' + value + ' ' +
                        fromQuery +
                        ' GROUP BY t, ' + keyAlias +
                        ' ORDER BY t, ' + keyAlias +
                        ') ' +
                        'GROUP BY t ' +
                        'ORDER BY t ';
                };
                // $rateColumns(query)
                SqlQuery.rateColumns = function (query) {
                    if (query.slice(0, 13) == '$rateColumns(') {
                        var fromIndex = SqlQuery._fromIndex(query);
                        var args = query.slice(13, fromIndex)
                            .trim() // rm spaces
                            .slice(0, -1) // cut ending brace
                            .split(','); // extract arguments
                        if (args.length != 2) {
                            throw { message: 'Amount of arguments must equal 2 for $columns func. Parsed arguments are: ' + args.join(', ') };
                        }
                        query = SqlQuery._columns(args[0], args[1], query.slice(fromIndex));
                        query = 'SELECT t' +
                            ', arrayMap(a -> (a.1, a.2/runningDifference( t/1000 )), groupArr)' +
                            ' FROM (' +
                            query +
                            ')';
                    }
                    return query;
                };
                // $rate(query)
                SqlQuery.rate = function (query) {
                    if (query.slice(0, 6) == '$rate(') {
                        var fromIndex = SqlQuery._fromIndex(query);
                        var args = query.slice(6, fromIndex)
                            .trim() // rm spaces
                            .slice(0, -1) // cut ending brace
                            .split(','); // extract arguments
                        if (args.length < 1) {
                            throw { message: 'Amount of arguments must be > 0 for $rate func. Parsed arguments are: ' + args.join(', ') };
                        }
                        query = SqlQuery._rate(args, query.slice(fromIndex));
                    }
                    return query;
                };
                SqlQuery._fromIndex = function (query) {
                    var fromIndex = query.toLowerCase().indexOf('from');
                    if (fromIndex == -1) {
                        throw { message: 'Could not find FROM-statement at: ' + query };
                    }
                    return fromIndex;
                };
                SqlQuery._rate = function (args, fromQuery) {
                    var aliases = [];
                    lodash_1.default.each(args, function (arg) {
                        if (arg.slice(-1) == ')') {
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
                    if (query.toLowerCase().indexOf('where') != -1) {
                        query = query.replace(/where/i, 'WHERE $timeFilter AND ');
                    }
                    else {
                        query += ' WHERE $timeFilter';
                    }
                    return query;
                };
                SqlQuery.getTimeFilter = function (isToNow) {
                    if (isToNow) {
                        return '$timeCol >= toDate($from) AND $dateTimeCol >= toDateTime($from)';
                    }
                    else {
                        return '$timeCol BETWEEN toDate($from) AND toDate($to) AND $dateTimeCol BETWEEN toDateTime($from) AND toDateTime($to)';
                    }
                };
                // date is a moment object
                SqlQuery.convertTimestamp = function (date) {
                    //return date.format("'Y-MM-DD HH:mm:ss'")
                    if (lodash_1.default.isString(date)) {
                        date = dateMath.parse(date, true);
                    }
                    return Math.ceil(date.valueOf() / 1000);
                };
                SqlQuery.convertInterval = function (interval) {
                    if (interval < 1000) {
                        return 1;
                    }
                    return Math.ceil(interval / 1000);
                };
                SqlQuery.REGEX_COLUMNS = /(?:\s*(?=\w+\.|.*as\s+|distinct\s+|)(\*|\w+|(?:,|\s+)|\w+\([a-z*]+\))(?=\s*(?=,|$)))/ig;
                return SqlQuery;
            })();
            exports_1("default", SqlQuery);
        }
    }
});
//# sourceMappingURL=sql_query.js.map