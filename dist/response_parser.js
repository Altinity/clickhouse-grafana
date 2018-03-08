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
                    var sqlResults = results.data;
                    var res = [];
                    lodash_1.default.each(sqlResults, function (r) {
                        if (!lodash_1.default.isObject(r)) {
                            res.push({ text: r });
                            return;
                        }
                        var keys = Object.keys(r);
                        if (keys.length > 1) {
                            res.push(r);
                        }
                        else {
                            res.push({ text: r[keys[0]] });
                        }
                    });
                    return res;
                };
                return ResponseParser;
            })();
            exports_1("default", ResponseParser);
        }
    }
});
//# sourceMappingURL=response_parser.js.map