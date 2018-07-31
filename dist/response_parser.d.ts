/// <reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
export default class ResponseParser {
    private $q;
    constructor($q: any);
    parse(query: any, results: any): any[];
    transformAnnotationResponse(options: any, data: any): any;
}
