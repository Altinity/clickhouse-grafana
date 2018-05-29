///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import $ from 'jquery';
import _ from 'lodash';
import './clickhouse-info';
import './mode-clickhouse';
import './snippets/clickhouse';
import SqlQuery from './sql_query';
import {QueryCtrl} from 'app/plugins/sdk';
import Scanner from './scanner';

const defaultQuery = "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t";

class SqlQueryCtrl extends QueryCtrl {
    static templateUrl = 'partials/query.editor.html';

    queryModel: SqlQuery;
    databaseSegment: any;

    dateTimeType: any;
    dateColDataTypeSegment: any;
    dateTimeColDataTypeSegment: any;
    tableSegment: any;
    formats: any[];

    panel: any;
    datasource: any;
    target: any;
    resolutions: any;
    scanner: any;
    editMode: boolean;
    textareaHeight: any;
    dateTimeTypeOptions: any;

    completerCache: any[];

    tableLoading: boolean;
    datetimeLoading: boolean;
    dateLoading: boolean;

    showLastQuerySQL: boolean;
    showHelp: boolean;

    /** @ngInject **/
    constructor($scope, $injector, templateSrv, private uiSegmentSrv) {
        super($scope, $injector);

        this.queryModel = new SqlQuery(this.target, templateSrv, this.panel.scopedVars);

        let defaultDatabaseSegment = {fake: true, value: '-- database --'};
        if (this.datasource.defaultDatabase.length > 0) {
            defaultDatabaseSegment = {fake: false, value: this.datasource.defaultDatabase};
        }
        this.databaseSegment = uiSegmentSrv.newSegment(
            this.target.database || defaultDatabaseSegment
        );

        this.tableSegment = uiSegmentSrv.newSegment(
            this.target.table || {fake: true, value: '-- table --'}
        );

        this.dateColDataTypeSegment = uiSegmentSrv.newSegment(
            this.target.dateColDataType || {fake: true, value: '-- date : col --'}
        );

        this.dateTimeColDataTypeSegment = uiSegmentSrv.newSegment(
            this.target.dateTimeColDataType || {fake: true, value: '-- dateTime : col --'}
        );

        this.resolutions = _.map([1,2,3,4,5,10], function(f) {
            return {factor: f, label: '1/' + f};
        });

        this.completerCache = [];

        this.dateTimeTypeOptions =  [
            {text: 'Column:DateTime', value: 'DATETIME'},
            {text: 'Column:TimeStamp', value: 'TIMESTAMP'},
        ];

        this.formats = [
            {text: 'Time series', value: 'time_series'},
            {text: 'Table', value: 'table'},
        ];

        this.target.format = this.target.format || 'time_series';
        this.target.dateTimeType = this.target.dateTimeType || this.dateTimeTypeOptions[0].value;
        this.target.round = this.target.round || "0s";
        this.target.intervalFactor = this.target.intervalFactor || 1;
        this.target.query = this.target.query || defaultQuery;
        this.target.formattedQuery = this.target.formattedQuery || this.target.query;
        this.scanner = new Scanner(this.target.query);
        if (this.target.query === defaultQuery) {
            this.target.query = this.format();
        }

        /* Update database if default database is used to prepopulate the field */
        if (this.target.database === undefined && !defaultDatabaseSegment.fake) {
            this.databaseChanged();
        }
    }

    getCollapsedText() {
        return this.target.query;
    }

    fakeSegment(value) {
        return this.uiSegmentSrv.newSegment({fake: true, value: value});
    }

    getDateColDataTypeSegments() {
        var target = this.target;
        target.dateLoading = true;
        return this.querySegment('DATE').then(function(response){
            target.dateLoading = false;
            return response;
        });
    }

    dateColDataTypeChanged() {
        this.target.dateColDataType = this.dateColDataTypeSegment.value;
    }

    dateTimeTypeChanged() {
        var self = this;
        this.getDateTimeColDataTypeSegments().then(function(segments) {
            if (segments.length === 0) {
                return;
            }
            self.applySegment(self.dateTimeColDataTypeSegment, segments[0]);
            self.dateTimeColDataTypeChanged();
        });
    }

    getDateTimeColDataTypeSegments() {
        var target = this.target;
        target.datetimeLoading = true;
        return this.querySegment(target.dateTimeType).then(function(response){
            target.datetimeLoading = false;
            return response;
        });
    }

    dateTimeColDataTypeChanged() {
        this.target.dateTimeColDataType = this.dateTimeColDataTypeSegment.value;
    }

    toggleEditorMode() {
        this.target.rawQuery = !this.target.rawQuery;
    }

    toggleEdit(e: any, editMode: boolean) {
        if (editMode) {
            this.editMode = true;
            this.textareaHeight = "height: " + $(e.currentTarget).outerHeight() + "px;";
            return;
        }

        if ( this.editMode === true ) {
            this.editMode = false;
            this.refresh();
        }
    }

    getCompleter() {
        return this;
    }

    getCompletions(editor, session, pos, prefix, callback) {
        if (this.target.database === undefined || this.target.table === undefined) {
            callback(null, []);
            return;
        }

        let self = this;
        let key = self.target.database + '.' + self.target.table;
        if (self.completerCache[key]) {
            callback(null, self.completerCache[key]);
            return;
        }

        self.queryColumns().then(function(response){
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
    }

    static _convertToHTML(item: any) {
        var desc = item.value,
            space_index = 0,
            start = 0,
            line = "",
            next_line_end = 60,
            lines = [];
        for (var i = 0; i < desc.length; i++) {
            if (desc[i] === ' ') {
                space_index = i;
            } else if (i >= next_line_end  && space_index !== 0) {
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
    }

    getDatabaseSegments() {
        return this.querySegment('DATABASES');
    }

    databaseChanged() {
        this.target.database = this.databaseSegment.value;
        this.applySegment(this.tableSegment, this.fakeSegment('-- table : col --'));
        this.applySegment(this.dateColDataTypeSegment, this.fakeSegment('-- date : col --'));
        this.applySegment(this.dateTimeColDataTypeSegment, this.fakeSegment('-- dateTime : col --'));
    }

    getTableSegments() {
        var target = this.target;
        target.tableLoading = true;
        return this.querySegment('TABLES').then(function(response){
            target.tableLoading = false;
            return response;
        });
    }

    tableChanged() {
        this.target.table = this.tableSegment.value;
        this.applySegment(this.dateColDataTypeSegment, this.fakeSegment('-- date : col --'));
        this.applySegment(this.dateTimeColDataTypeSegment, this.fakeSegment('-- dateTime : col --'));

        var self = this;
        this.getDateColDataTypeSegments().then(function(segments) {
            if (segments.length === 0) {
                return;
            }
            self.applySegment(self.dateColDataTypeSegment, segments[0]);
            self.dateColDataTypeChanged();
        });
        this.getDateTimeColDataTypeSegments().then(function(segments) {
            if (segments.length === 0) {
                return;
            }
            self.applySegment(self.dateTimeColDataTypeSegment, segments[0]);
            self.dateTimeColDataTypeChanged();
        });
    }

    formatQuery() {
        this.target.query = this.format();
        this.toggleEdit({}, false);
    }

    toQueryMode() {
        this.toggleEditorMode();
        this.refresh();
    }

    format() {
        try {
            return this.getScanner().Format();
        } catch (err) {
            console.log("Parse error: ", err);
            return this.getScanner().raw();
        }
    }

    getScanner() {
        if (this.scanner.raw() !== this.target.query) {
            this.scanner = new Scanner(this.target.query);
        }
        return this.scanner;
    }

    handleQueryError(err) {
        this.error = err.message || 'Failed to issue metric query';
        return [];
    }

    queryColumns() {
        var query = this.buildExploreQuery('COLUMNS');
        return this.datasource.metricFindQuery(query)
    }

    querySegment(type: string) {
        var query = this.buildExploreQuery(type);
        return this.datasource.metricFindQuery(query)
            .then(this.uiSegmentSrv.transformToSegments(false))
            .catch(this.handleQueryError.bind(this));
    }

    applySegment(dst, src) {
        dst.value = src.value;
        dst.html = src.html || src.value;
        dst.fake = src.fake === undefined ? false : src.fake;
    }

    buildExploreQuery(type) {
        var query;
        switch (type){
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
}
export {SqlQueryCtrl};
