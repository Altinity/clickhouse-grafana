System.register([], function(exports_1) {
    var columnsQuery, regexEnum, AdhocCtrl;
    return {
        setters:[],
        execute: function() {
            columnsQuery = "SELECT database, table, name, type FROM system.columns where database != 'system' ORDER BY database, table";
            regexEnum = /'(?:[^']+|'')+'/gmi;
            AdhocCtrl = (function () {
                /** @ngInject */
                function AdhocCtrl() {
                    this.tagKeys = [];
                    this.tagValues = [];
                }
                AdhocCtrl.prototype.GetTagKeys = function (datasource) {
                    var self = this;
                    if (this.tagKeys.length > 0) {
                        return Promise.resolve(this.tagKeys);
                    }
                    return datasource.metricFindQuery(columnsQuery)
                        .then(function (response) {
                        response.forEach(function (item) {
                            var text = item.database + '.' + item.table + '.' + item.name;
                            var value = item.name;
                            self.tagKeys.push({ text: text, value: value });
                            if (item.type.slice(0, 4) === 'Enum') {
                                var options = item.type.match(regexEnum);
                                if (options.length > 0) {
                                    self.tagValues[text] = [];
                                    options.forEach(function (o) {
                                        self.tagValues[text].push({ text: o, value: o });
                                    });
                                }
                            }
                        });
                        return Promise.resolve(self.tagKeys);
                    });
                };
                AdhocCtrl.prototype.GetTagValues = function (options) {
                    if (this.tagValues.hasOwnProperty(options.key)) {
                        return Promise.resolve(this.tagValues[options.key]);
                    }
                    return Promise.resolve([]);
                };
                return AdhocCtrl;
            })();
            exports_1("default", AdhocCtrl);
        }
    }
});
//# sourceMappingURL=adhoc.js.map