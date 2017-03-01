System.register(["lodash"], function (exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var lodash_1, ResponseParser;
    return {
        setters: [
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            }
        ],
        execute: function () {
            ResponseParser = (function () {
                function ResponseParser() {
                }
                ResponseParser.prototype.parse = function (query, results) {
                    if (!results || results.data.length === 0) {
                        return [];
                    }
                    var sqlResults = results.data;
                    var res = [], v;
                    lodash_1.default.each(sqlResults, function (row) {
                        lodash_1.default.each(row, function (value) {
                            if (lodash_1.default.isArray(value) || lodash_1.default.isOb) {
                                v = value[0];
                            }
                            else {
                                v = value;
                            }
                            if (res.indexOf(v) === -1) {
                                res.push(v);
                            }
                        });
                    });
                    return lodash_1.default.map(res, function (value) {
                        return { text: value };
                    });
                };
                return ResponseParser;
            }());
            exports_1("default", ResponseParser);
        }
    };
});
//# sourceMappingURL=response_parser.js.map