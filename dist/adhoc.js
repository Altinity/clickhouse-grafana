System.register([], function(exports_1) {
    var queryFilter, columnsQuery, regexEnum, AdhocCtrl;
    return {
        setters:[],
        execute: function() {
            queryFilter = "database != 'system'";
            columnsQuery = "SELECT database, table, name, type FROM system.columns WHERE {filter} ORDER BY database, table";
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
                    var query = columnsQuery.replace('{filter}', queryFilter);
                    if (datasource.defaultDatabase.length > 0) {
                        query = columnsQuery.replace('{filter}', "database = '" + datasource.defaultDatabase + "' AND " + queryFilter);
                    }
                    return datasource.metricFindQuery(query)
                        .then(function (response) {
                        var columnNames = {};
                        response.forEach(function (item) {
                            var text = item.table + '.' + item.name;
                            if (datasource.defaultDatabase.length == 0) {
                                text = item.database + '.' + text;
                            }
                            var value = item.name;
                            self.tagKeys.push({ text: text, value: value });
                            if (item.type.slice(0, 4) === 'Enum') {
                                var options = item.type.match(regexEnum);
                                if (options.length > 0) {
                                    self.tagValues[text] = [];
                                    options.forEach(function (o) {
                                        self.tagValues[text].push({ text: o, value: o });
                                    });
                                    self.tagValues[item.name] = self.tagValues[text];
                                }
                            }
                            columnNames[item.name] = true;
                        });
                        /* Store unique column names with wildcard table */
                        Object.keys(columnNames).forEach(function (columnName) {
                            self.tagKeys.push({ text: columnName, value: columnName });
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