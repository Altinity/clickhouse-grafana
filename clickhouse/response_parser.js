///<reference path="app/headers/common.d.ts" />
System.register(['lodash'], function(exports_1) {
    var lodash_1;
    var ResponseParser;
    function addUnique(arr, value) {
        arr[value] = value;
    }
    return {
        setters:[
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            }],
        execute: function() {
            ResponseParser = (function () {
                function ResponseParser() {
                }
                ResponseParser.prototype.parse = function (query, results) {
                    if (!results || results.data.length === 0) {
                        return [];
                    }
                    var sqlResults = results.data;
                    var res = {};
                    lodash_1.default.each(sqlResults, function (row) {
                        lodash_1.default.each(row, function (value) {
                            if (lodash_1.default.isArray(value) || lodash_1.default.isOb) {
                                addUnique(res, value[0]);
                            }
                            else {
                                addUnique(res, value);
                            }
                        });
                    });
                    return lodash_1.default.map(res, function (value) {
                        return { text: value };
                    });
                };
                return ResponseParser;
            })();
            exports_1("default", ResponseParser);
        }
    }
});
//# sourceMappingURL=response_parser.js.map