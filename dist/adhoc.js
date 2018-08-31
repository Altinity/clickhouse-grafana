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
                function AdhocCtrl(datasource) {
                    this.tagKeys = [];
                    this.tagValues = [];
                    this.datasource = datasource;
                    var filter = queryFilter;
                    if (datasource.defaultDatabase.length > 0) {
                        filter = "database = '" + datasource.defaultDatabase + "' AND " + queryFilter;
                    }
                    this.query = columnsQuery.replace('{filter}', filter);
                }
                AdhocCtrl.prototype.GetTagKeys = function () {
                    var self = this;
                    if (this.tagKeys.length > 0) {
                        return Promise.resolve(this.tagKeys);
                    }
                    return this.datasource.metricFindQuery(this.query)
                        .then(function (response) {
                        return self.processResponse(response);
                    });
                };
                AdhocCtrl.prototype.GetTagValues = function (options) {
                    if (this.tagValues.hasOwnProperty(options.key)) {
                        return Promise.resolve(this.tagValues[options.key]);
                    }
                    return Promise.resolve([]);
                };
                AdhocCtrl.prototype.processResponse = function (response) {
                    var self = this;
                    var columnNames = {};
                    response.forEach(function (item) {
                        var text = item.table + '.' + item.name;
                        if (self.datasource.defaultDatabase.length == 0) {
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
                };
                return AdhocCtrl;
            })();
            exports_1("default", AdhocCtrl);
        }
    }
});
//# sourceMappingURL=adhoc.js.map