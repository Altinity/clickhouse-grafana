System.register(['lodash'], function(exports_1) {
    var lodash_1;
    var ResponseParser;
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
                    var res = [];
                    var sqlResults = results.data;
                    var keys = Object.keys(sqlResults[0]);
                    var textColIndex = ResponseParser.findColIndex(keys, '__text');
                    var valueColIndex = ResponseParser.findColIndex(keys, '__value');
                    var keyValuePairs = keys.length === 2 && textColIndex !== -1 && valueColIndex !== -1;
                    var r;
                    for (var _i = 0; _i < sqlResults.length; _i++) {
                        r = sqlResults[_i];
                        if (!lodash_1.default.isObject(r)) {
                            res.push({ text: r });
                            return;
                        }
                        if (keys.length > 1) {
                            if (keyValuePairs) {
                                res.push({ text: r[keys[textColIndex]], value: r[keys[valueColIndex]] });
                            }
                            else {
                                res.push(r);
                            }
                        }
                        else {
                            res.push({ text: r[keys[0]] });
                        }
                    }
                    return res;
                };
                ResponseParser.findColIndex = function (columns, colName) {
                    for (var i = 0; i < columns.length; i++) {
                        if (columns[i] === colName) {
                            return i;
                        }
                    }
                    return -1;
                };
                return ResponseParser;
            })();
            exports_1("default", ResponseParser);
        }
    }
});
//# sourceMappingURL=response_parser.js.map