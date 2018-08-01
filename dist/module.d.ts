import { ClickHouseDatasource } from './datasource';
import { SqlQueryCtrl } from './query_ctrl';
declare class SqlConfigCtrl {
    static templateUrl: string;
}
declare class ClickHouseAnnotationsQueryCtrl {
    static templateUrl: string;
    annotation: any;
    /** @ngInject **/
    constructor();
}
export { ClickHouseDatasource as Datasource, SqlQueryCtrl as QueryCtrl, SqlConfigCtrl as ConfigCtrl, ClickHouseAnnotationsQueryCtrl as AnnotationsQueryCtrl };
