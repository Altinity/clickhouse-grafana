export default class AdhocCtrl {
    tagKeys: any[];
    tagValues: any[];
    /** @ngInject */
    constructor();
    GetTagKeys(datasource: any): any;
    GetTagValues(options: any): Promise<any>;
}
