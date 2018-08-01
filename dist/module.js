System.register(['./datasource', './query_ctrl'], function(exports_1) {
    var datasource_1, query_ctrl_1;
    var SqlConfigCtrl, defaultQuery, ClickHouseAnnotationsQueryCtrl;
    return {
        setters:[
            function (datasource_1_1) {
                datasource_1 = datasource_1_1;
            },
            function (query_ctrl_1_1) {
                query_ctrl_1 = query_ctrl_1_1;
            }],
        execute: function() {
            SqlConfigCtrl = (function () {
                function SqlConfigCtrl() {
                }
                SqlConfigCtrl.templateUrl = 'partials/config.html';
                return SqlConfigCtrl;
            })();
            defaultQuery = "SELECT\n  toUInt32(toDateTime(ts)) * 1000 AS time,\n  description AS text,\n  tags\nFROM\n  event_table\nWHERE\n  ts >= $from AND ts < $to\n";
            ClickHouseAnnotationsQueryCtrl = (function () {
                /** @ngInject **/
                function ClickHouseAnnotationsQueryCtrl() {
                    this.annotation.query = this.annotation.query || defaultQuery;
                }
                ClickHouseAnnotationsQueryCtrl.templateUrl = 'partials/annotations.editor.html';
                return ClickHouseAnnotationsQueryCtrl;
            })();
            exports_1("Datasource", datasource_1.ClickHouseDatasource);
            exports_1("QueryCtrl", query_ctrl_1.SqlQueryCtrl);
            exports_1("ConfigCtrl", SqlConfigCtrl);
            exports_1("AnnotationsQueryCtrl", ClickHouseAnnotationsQueryCtrl);
        }
    }
});
//# sourceMappingURL=module.js.map