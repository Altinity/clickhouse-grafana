///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
System.register(['jquery', 'lodash', './clickhouse-info', './mode-clickhouse', './snippets/clickhouse', './sql_query', 'app/plugins/sdk', './scanner'], function(exports_1) {
    var __extends = (this && this.__extends) || function (d, b) {
        for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
    var jquery_1, lodash_1, sql_query_1, sdk_1, scanner_1;
    var defaultQuery, SqlQueryCtrl;
    return {
        setters:[
            function (jquery_1_1) {
                jquery_1 = jquery_1_1;
            },
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (_1) {},
            function (_2) {},
            function (_3) {},
            function (sql_query_1_1) {
                sql_query_1 = sql_query_1_1;
            },
            function (sdk_1_1) {
                sdk_1 = sdk_1_1;
            },
            function (scanner_1_1) {
                scanner_1 = scanner_1_1;
            }],
        execute: function() {
            defaultQuery = "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t";
            SqlQueryCtrl = (function (_super) {
                __extends(SqlQueryCtrl, _super);
                /** @ngInject **/
                function SqlQueryCtrl($scope, $injector, templateSrv, uiSegmentSrv) {
                    _super.call(this, $scope, $injector);
                    this.uiSegmentSrv = uiSegmentSrv;
                    this.queryModel = new sql_query_1.default(this.target, templateSrv, this.panel.scopedVars);
                    var defaultDatabaseSegment = { fake: true, value: '-- database --' };
                    if (this.datasource.defaultDatabase.length > 0) {
                        defaultDatabaseSegment = { fake: false, value: this.datasource.defaultDatabase };
                    }
                    this.databaseSegment = uiSegmentSrv.newSegment(this.target.database || defaultDatabaseSegment);
                    this.tableSegment = uiSegmentSrv.newSegment(this.target.table || { fake: true, value: '-- table --' });
                    this.dateColDataTypeSegment = uiSegmentSrv.newSegment(this.target.dateColDataType || { fake: true, value: '-- date : col --' });
                    this.dateTimeColDataTypeSegment = uiSegmentSrv.newSegment(this.target.dateTimeColDataType || { fake: true, value: '-- dateTime : col --' });
                    this.resolutions = lodash_1.default.map([1, 2, 3, 4, 5, 10], function (f) {
                        return { factor: f, label: '1/' + f };
                    });
                    this.completerCache = [];
                    this.dateTimeTypeOptions = [
                        { text: 'Column:DateTime', value: 'DATETIME' },
                        { text: 'Column:TimeStamp', value: 'TIMESTAMP' },
                    ];
                    this.formats = [
                        { text: 'Time series', value: 'time_series' },
                        { text: 'Table', value: 'table' },
                    ];
                    this.target.format = this.target.format || 'time_series';
                    this.target.dateTimeType = this.target.dateTimeType || this.dateTimeTypeOptions[0].value;
                    this.target.round = this.target.round || "0s";
                    this.target.intervalFactor = this.target.intervalFactor || 1;
                    this.target.query = this.target.query || defaultQuery;
                    this.target.formattedQuery = this.target.formattedQuery || this.target.query;
                    this.scanner = new scanner_1.default(this.target.query);
                    if (this.target.query === defaultQuery) {
                        this.target.query = this.format();
                    }
                    /* Update database if default database is used to prepopulate the field */
                    if (this.target.database === undefined && !defaultDatabaseSegment.fake) {
                        this.databaseChanged();
                    }
                }
                SqlQueryCtrl.prototype.getCollapsedText = function () {
                    return this.target.query;
                };
                SqlQueryCtrl.prototype.fakeSegment = function (value) {
                    return this.uiSegmentSrv.newSegment({ fake: true, value: value });
                };
                SqlQueryCtrl.prototype.getDateColDataTypeSegments = function () {
                    var target = this.target;
                    target.dateLoading = true;
                    return this.querySegment('DATE').then(function (response) {
                        target.dateLoading = false;
                        return response;
                    });
                };
                SqlQueryCtrl.prototype.dateColDataTypeChanged = function () {
                    var val = this.dateColDataTypeSegment.value;
                    if (typeof val === 'string') {
                        this.target.dateColDataType = val.trim();
                    }
                    else {
                        this.target.dateColDataType = val;
                    }
                };
                SqlQueryCtrl.prototype.dateTimeTypeChanged = function () {
                    var self = this;
                    this.getDateTimeColDataTypeSegments().then(function (segments) {
                        if (segments.length === 0) {
                            return;
                        }
                        self.applySegment(self.dateTimeColDataTypeSegment, segments[0]);
                        self.dateTimeColDataTypeChanged();
                    });
                };
                SqlQueryCtrl.prototype.getDateTimeColDataTypeSegments = function () {
                    var target = this.target;
                    target.datetimeLoading = true;
                    return this.querySegment(target.dateTimeType).then(function (response) {
                        target.datetimeLoading = false;
                        return response;
                    });
                };
                SqlQueryCtrl.prototype.dateTimeColDataTypeChanged = function () {
                    var val = this.dateTimeColDataTypeSegment.value;
                    if (typeof val === 'string') {
                        this.target.dateTimeColDataType = val.trim();
                    }
                    else {
                        this.target.dateTimeColDataType = val;
                    }
                };
                SqlQueryCtrl.prototype.toggleEditorMode = function () {
                    this.target.rawQuery = !this.target.rawQuery;
                };
                SqlQueryCtrl.prototype.toggleEdit = function (e, editMode) {
                    if (editMode) {
                        this.editMode = true;
                        this.textareaHeight = "height: " + jquery_1.default(e.currentTarget).outerHeight() + "px;";
                        return;
                    }
                    if (this.editMode === true) {
                        this.editMode = false;
                        this.refresh();
                    }
                };
                SqlQueryCtrl.prototype.getCompleter = function () {
                    return this;
                };
                SqlQueryCtrl.prototype.getCompletions = function (editor, session, pos, prefix, callback) {
                    if (this.target.database === undefined || this.target.table === undefined) {
                        callback(null, []);
                        return;
                    }
                    var self = this;
                    var key = self.target.database + '.' + self.target.table;
                    if (self.completerCache[key]) {
                        callback(null, self.completerCache[key]);
                        return;
                    }
                    self.queryColumns().then(function (response) {
                        self.completerCache[key] = response.map(function (item) {
                            return {
                                caption: item.text,
                                value: item.text,
                                meta: key,
                                docHTML: SqlQueryCtrl._convertToHTML(item),
                            };
                        });
                        callback(null, self.completerCache[key]);
                    });
                };
                SqlQueryCtrl._convertToHTML = function (item) {
                    var desc = item.value, space_index = 0, start = 0, line = "", next_line_end = 60, lines = [];
                    for (var i = 0; i < desc.length; i++) {
                        if (desc[i] === ' ') {
                            space_index = i;
                        }
                        else if (i >= next_line_end && space_index !== 0) {
                            line = desc.slice(start, space_index);
                            lines.push(line);
                            start = space_index + 1;
                            next_line_end = i + 60;
                            space_index = 0;
                        }
                    }
                    line = desc.slice(start);
                    lines.push(line);
                    return ["<b>", item.text, "</b>", "<hr></hr>", lines.join("&nbsp<br>")].join("");
                };
                SqlQueryCtrl.prototype.getDatabaseSegments = function () {
                    return this.querySegment('DATABASES');
                };
                SqlQueryCtrl.prototype.databaseChanged = function () {
                    this.target.database = this.databaseSegment.value;
                    this.applySegment(this.tableSegment, this.fakeSegment('-- table : col --'));
                    this.applySegment(this.dateColDataTypeSegment, this.fakeSegment('-- date : col --'));
                    this.applySegment(this.dateTimeColDataTypeSegment, this.fakeSegment('-- dateTime : col --'));
                };
                SqlQueryCtrl.prototype.getTableSegments = function () {
                    var target = this.target;
                    target.tableLoading = true;
                    return this.querySegment('TABLES').then(function (response) {
                        target.tableLoading = false;
                        return response;
                    });
                };
                SqlQueryCtrl.prototype.tableChanged = function () {
                    this.target.table = this.tableSegment.value;
                    this.applySegment(this.dateColDataTypeSegment, this.fakeSegment('-- date : col --'));
                    this.applySegment(this.dateTimeColDataTypeSegment, this.fakeSegment('-- dateTime : col --'));
                    var self = this;
                    this.getDateColDataTypeSegments().then(function (segments) {
                        if (segments.length === 0) {
                            return;
                        }
                        self.applySegment(self.dateColDataTypeSegment, segments[0]);
                        self.dateColDataTypeChanged();
                    });
                    this.getDateTimeColDataTypeSegments().then(function (segments) {
                        if (segments.length === 0) {
                            return;
                        }
                        self.applySegment(self.dateTimeColDataTypeSegment, segments[0]);
                        self.dateTimeColDataTypeChanged();
                    });
                };
                SqlQueryCtrl.prototype.formatQuery = function () {
                    this.target.query = this.format();
                    this.toggleEdit({}, false);
                };
                SqlQueryCtrl.prototype.toQueryMode = function () {
                    this.toggleEditorMode();
                    this.refresh();
                };
                SqlQueryCtrl.prototype.format = function () {
                    try {
                        return this.getScanner().Format();
                    }
                    catch (err) {
                        console.log("Parse error: ", err);
                        return this.getScanner().raw();
                    }
                };
                SqlQueryCtrl.prototype.getScanner = function () {
                    if (this.scanner.raw() !== this.target.query) {
                        this.scanner = new scanner_1.default(this.target.query);
                    }
                    return this.scanner;
                };
                SqlQueryCtrl.prototype.handleQueryError = function (err) {
                    this.error = err.message || 'Failed to issue metric query';
                    return [];
                };
                SqlQueryCtrl.prototype.queryColumns = function () {
                    var query = this.buildExploreQuery('COLUMNS');
                    return this.datasource.metricFindQuery(query);
                };
                SqlQueryCtrl.prototype.querySegment = function (type) {
                    var query = this.buildExploreQuery(type);
                    return this.datasource.metricFindQuery(query)
                        .then(this.uiSegmentSrv.transformToSegments(false))
                        .catch(this.handleQueryError.bind(this));
                };
                SqlQueryCtrl.prototype.applySegment = function (dst, src) {
                    dst.value = src.value;
                    dst.html = src.html || src.value;
                    dst.fake = src.fake === undefined ? false : src.fake;
                };
                SqlQueryCtrl.prototype.buildExploreQuery = function (type) {
                    var query;
                    switch (type) {
                        case 'TABLES':
                            query = 'SELECT name ' +
                                'FROM system.tables ' +
                                'WHERE database = \'' + this.target.database + '\' ' +
                                'ORDER BY name';
                            break;
                        case 'DATE':
                            query = 'SELECT name ' +
                                'FROM system.columns ' +
                                'WHERE database = \'' + this.target.database + '\' AND ' +
                                'table = \'' + this.target.table + '\' AND ' +
                                'type = \'Date\' ' +
                                'ORDER BY name';
                            break;
                        case 'DATETIME':
                            query = 'SELECT name ' +
                                'FROM system.columns ' +
                                'WHERE database = \'' + this.target.database + '\' AND ' +
                                'table = \'' + this.target.table + '\' AND ' +
                                'type LIKE \'DateTime%\' ' +
                                'ORDER BY name';
                            break;
                        case 'TIMESTAMP':
                            query = 'SELECT name ' +
                                'FROM system.columns ' +
                                'WHERE database = \'' + this.target.database + '\' AND ' +
                                'table = \'' + this.target.table + '\' AND ' +
                                'type = \'UInt32\' ' +
                                'ORDER BY name';
                            break;
                        case 'DATABASES':
                            query = 'SELECT name ' +
                                'FROM system.databases ' +
                                'ORDER BY name';
                            break;
                        case 'COLUMNS':
                            query = 'SELECT name text, type value ' +
                                'FROM system.columns ' +
                                'WHERE database = \'' + this.target.database + '\' AND ' +
                                'table = \'' + this.target.table + '\'';
                            break;
                    }
                    return query;
                };
                ;
                SqlQueryCtrl.templateUrl = 'partials/query.editor.html';
                return SqlQueryCtrl;
            })(sdk_1.QueryCtrl);
            exports_1("SqlQueryCtrl", SqlQueryCtrl);
        }
    }
});
//# sourceMappingURL=query_ctrl.js.map