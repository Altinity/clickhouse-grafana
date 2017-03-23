/// <reference path="../../../../../public/app/headers/common.d.ts" />
import SqlQuery from './sql_query';
import { QueryCtrl } from 'app/plugins/sdk';
declare class SqlQueryCtrl extends QueryCtrl {
    private templateSrv;
    private $q;
    private uiSegmentSrv;
    static templateUrl: string;
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
    constructor($scope: any, $injector: any, templateSrv: any, $q: any, uiSegmentSrv: any);
    fakeSegment(value: any): any;
    getDatabaseSegments(): any;
    databaseChanged(): void;
    getTableSegments(): any;
    tableChanged(): void;
    getDateColDataTypeSegments(): any;
    dateColDataTypeChanged(): void;
    getDateTimeColDataTypeSegments(): any;
    dateTimeColDataTypeChanged(): void;
    toggleEditorMode(): void;
    toggleEdit(e: any, editMode: boolean): void;
    formatQuery(): void;
    toQueryMode(): void;
    getScanner(): any;
    handleQueryError(err: any): any[];
    querySegment(type: string): any;
    applySegment(dst: any, src: any): void;
    getCollapsedText(): any;
}
export { SqlQueryCtrl };
