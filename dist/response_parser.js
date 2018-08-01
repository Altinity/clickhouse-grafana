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
                function ResponseParser($q) {
                    this.$q = $q;
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
                ResponseParser.prototype.transformAnnotationResponse = function (options, data) {
                    var rows = data.data;
                    var columns = data.meta;
                    var result = [];
                    var hasTime = false;
                    for (var i = 0, len = columns.length; i < len; i++) {
                        var column = columns[i];
                        if (column.name === 'time') {
                            hasTime = true;
                            break;
                        }
                    }
                    if (!hasTime) {
                        return this.$q.reject({
                            message: 'Missing mandatory time column in annotation query.',
                        });
                    }
                    for (var i = 0, len = rows.length; i < len; i++) {
                        var row = rows[i];
                        result.push({
                            annotation: options.annotation,
                            time: Math.floor(row.time),
                            title: row.title,
                            text: row.text,
                            tags: row.tags ? row.tags.trim().split(/\s*,\s*/) : []
                        });
                    }
                    return result;
                };
                return ResponseParser;
            })();
            exports_1("default", ResponseParser);
        }
    }
});
//# sourceMappingURL=response_parser.js.map