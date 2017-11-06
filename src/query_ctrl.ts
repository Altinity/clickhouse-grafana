///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import $ from 'jquery';
import _ from 'lodash';
import SqlQueryBuilder from './query_builder';
import SqlQuery from './sql_query';
import {QueryCtrl} from 'app/plugins/sdk';
import Scanner from './scanner';

class SqlQueryCtrl extends QueryCtrl {
    static templateUrl = 'partials/query.editor.html';

    queryModel: SqlQuery;
    queryBuilder: any;
    databaseSegment: any;
    dateColDataTypeSegment: any;
    dateTimeColDataTypeSegment: any;
    tableSegment: any;
    panel: any;
    datasource: any;
    target: any;
    resolutions: any;
    scanner: any;
    tableLoading: boolean;
    datetimeLoading: boolean;
    dateLoading: boolean;
    editMode: boolean;
    textareaHeight: any;

    /** @ngInject **/
    constructor($scope, $injector, templateSrv, private uiSegmentSrv) {
        super($scope, $injector);

        this.queryModel = new SqlQuery(this.target, templateSrv, this.panel.scopedVars);
        this.queryBuilder = new SqlQueryBuilder(this.target);

        this.databaseSegment = uiSegmentSrv.newSegment(
            this.target.database || {fake: true, value: '-- database --'}
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

        this.target.round = this.target.round || "0s";
        this.target.intervalFactor = this.target.intervalFactor || 1;
        this.target.query = this.target.query || "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t";
        this.target.formattedQuery = this.target.formattedQuery || this.target.query;
        this.scanner = new Scanner(this.target.query);
    }

    fakeSegment(value) {
        return this.uiSegmentSrv.newSegment({fake: true, value: value});
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

    getDateTimeColDataTypeSegments() {
        var target = this.target;
        target.datetimeLoading = true;
        return this.querySegment('DATE_TIME').then(function(response){
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

        this.target.formattedQuery = this.highlight();
        if ( this.editMode === true ) {
            this.editMode = false;
            this.refresh();
        }
    }

    formatQuery() {
        this.target.query = this.format();
        this.toggleEdit({}, false);
    }

    toQueryMode() {
        this.target.formattedQuery = this.highlight();
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

    highlight() {
        try {
            return this.getScanner().Highlight();
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

    querySegment(type: string) {
        var query = this.queryBuilder.buildExploreQuery(type);
        return this.datasource.metricFindQuery(query)
            .then(this.uiSegmentSrv.transformToSegments(false))
            .catch(this.handleQueryError.bind(this));
    }

    applySegment(dst, src) {
        dst.value = src.value;
        dst.html = src.html || src.value;
        dst.fake = src.fake === undefined ? false : src.fake;
    }

    getCollapsedText() {
        return this.target.query;
    }
}
export {SqlQueryCtrl};
