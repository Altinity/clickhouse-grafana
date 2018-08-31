export default class AdhocCtrl {
    tagKeys: any[];
    tagValues: any[];
    datasource: any;
    query: string;
    /** @ngInject */
    constructor(datasource: any);
    GetTagKeys(): any;
    GetTagValues(options: any): Promise<any>;
    processResponse(response: any): Promise<any[]>;
}
