/// <reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
import AdhocCtrl from './adhoc';
export declare class ClickHouseDatasource {
    private $q;
    private backendSrv;
    private templateSrv;
    type: string;
    name: string;
    supportMetrics: boolean;
    url: string;
    directUrl: string;
    basicAuth: any;
    withCredentials: any;
    usePOST: boolean;
    defaultDatabase: string;
    addCorsHeader: boolean;
    responseParser: any;
    adhocCtrl: AdhocCtrl;
    /** @ngInject */
    constructor(instanceSettings: any, $q: any, backendSrv: any, templateSrv: any);
    _request(query: string, requestId?: string): any;
    query(options: any): any;
    createQuery(options: any, target: any): {
        keys: any[];
        requestId: any;
        stmt: any;
    };
    annotationQuery(options: any): any;
    metricFindQuery(query: string, options?: any): any;
    testDatasource(): any;
    _seriesQuery(query: string, requestId?: string): any;
    targetContainsTemplate(target: any): any;
    getTagKeys(): any;
    getTagValues(options: any): Promise<any>;
}
