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
                        if (r && r.text && r.value) {
                            res.push({ text: r.text, value: r.value });
                            return;
                        }
                        if (lodash_1.default.isObject(r)) {
                            var key = Object.keys(r)[0];
                            res.push({ text: r[key] });
                            return;
                        }
                        res.push({ text: r });
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