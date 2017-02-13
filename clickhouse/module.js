System.register(["./datasource", "./query_ctrl"], function (exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var datasource_1, query_ctrl_1, SqlConfigCtrl, SqlQueryOptionsCtrl, SqlAnnotationsQueryCtrl;
    return {
        setters: [
            function (datasource_1_1) {
                datasource_1 = datasource_1_1;
            },
            function (query_ctrl_1_1) {
                query_ctrl_1 = query_ctrl_1_1;
            }
        ],
        execute: function () {
            exports_1("Datasource", datasource_1.ClickHouseDatasource);
            exports_1("QueryCtrl", query_ctrl_1.SqlQueryCtrl);
            SqlConfigCtrl = (function () {
                function SqlConfigCtrl() {
                }
                return SqlConfigCtrl;
            }());
            SqlConfigCtrl.templateUrl = 'partials/config.html';
            exports_1("ConfigCtrl", SqlConfigCtrl);
            SqlQueryOptionsCtrl = (function () {
                function SqlQueryOptionsCtrl() {
                }
                return SqlQueryOptionsCtrl;
            }());
            SqlQueryOptionsCtrl.templateUrl = 'partials/query.options.html';
            exports_1("QueryOptionsCtrl", SqlQueryOptionsCtrl);
            SqlAnnotationsQueryCtrl = (function () {
                function SqlAnnotationsQueryCtrl() {
                }
                return SqlAnnotationsQueryCtrl;
            }());
            SqlAnnotationsQueryCtrl.templateUrl = 'partials/annotations.editor.html';
            exports_1("AnnotationsQueryCtrl", SqlAnnotationsQueryCtrl);
        }
    };
});
//# sourceMappingURL=module.js.map