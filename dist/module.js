System.register(['./datasource', './query_ctrl'], function(exports_1) {
    var datasource_1, query_ctrl_1;
    var SqlConfigCtrl, SqlQueryOptionsCtrl, SqlAnnotationsQueryCtrl;
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
            SqlQueryOptionsCtrl = (function () {
                function SqlQueryOptionsCtrl() {
                }
                SqlQueryOptionsCtrl.templateUrl = 'partials/query.options.html';
                return SqlQueryOptionsCtrl;
            })();
            SqlAnnotationsQueryCtrl = (function () {
                function SqlAnnotationsQueryCtrl() {
                }
                SqlAnnotationsQueryCtrl.templateUrl = 'partials/annotations.editor.html';
                return SqlAnnotationsQueryCtrl;
            })();
            exports_1("Datasource", datasource_1.ClickHouseDatasource);
            exports_1("QueryCtrl", query_ctrl_1.SqlQueryCtrl);
            exports_1("ConfigCtrl", SqlConfigCtrl);
            exports_1("QueryOptionsCtrl", SqlQueryOptionsCtrl);
            exports_1("AnnotationsQueryCtrl", SqlAnnotationsQueryCtrl);
        }
    }
});
//# sourceMappingURL=module.js.map