const queryFilter = "database NOT IN ('system','INFORMATION_SCHEMA')";
const columnsQuery = "SELECT database, table, name, type FROM system.columns WHERE {filter} ORDER BY database, table";
const valuesQuery = "SELECT DISTINCT {field} AS value FROM {database}.{table} LIMIT 300";
const regexEnum = /'(?:[^']+|'')+'/gmi;

export default class AdHocFilter {
    tagKeys: any[];
    tagValues: {[key: string]: any} = {};
    datasource: any;
    query: string;

    /** @ngInject */
    constructor(datasource: any) {
        this.tagKeys = [];
        this.tagValues = [];
        this.datasource = datasource;
        let filter = queryFilter;
        if (datasource.defaultDatabase.length > 0) {
            filter = "database = '" + datasource.defaultDatabase + "' AND " + queryFilter;
        }
        this.query = columnsQuery.replace('{filter}', filter);
    }

    // GetTagKeys fetches columns from CH tables according to provided filters
    // if no filters applied all tables from all databases will be fetched
    // if datasource setting `defaultDatabase` is set only tables from that database will be fetched
    // if query param passed it will be performed instead of default
    GetTagKeys(query?: string) {
        let self = this;
        if (this.tagKeys.length > 0) {
            return Promise.resolve(this.tagKeys);
        }
        let q = this.query;
        if (query && query.length > 0) {
            q = query;
        }
        return this.datasource.metricFindQuery(q)
            .then(function (response: any) {
                return self.processTagKeysResponse(response);
            });
    }

    processTagKeysResponse(response: any) {
        let self = this;
        let columnNames: {[key: string]: any} = {}
        response.forEach(function (item: any) {
            let text: string = item.table + '.' + item.name;
            if (self.datasource.defaultDatabase.length === 0) {
                text = item.database + '.' + text;
            }
            let value = item.name;
            self.tagKeys.push({text: text, value: value});
            if (item.type.slice(0, 4) === 'Enum') {
                let options = item.type.match(regexEnum);
                if (options.length > 0) {
                    self.tagValues[text] = [];
                    options.forEach(function (o: any) {
                        self.tagValues[text].push({text: o, value: o});
                    });
                    self.tagValues[item.name] = self.tagValues[text];
                }
            }
            columnNames[item.name] = true;
        });
        /* Store unique column names with wildcard table */
        Object.keys(columnNames).forEach(columnName => {
            self.tagKeys.push({text: columnName, value: columnName});
        });
        return Promise.resolve(self.tagKeys);
    }

    // GetTagValues returns column values according to passed options
    // Values for fields with Enum type were already fetched in GetTagKeys func and stored in `tagValues`
    // Values for fields which not represented on `tagValues` get from ClickHouse and cached on `tagValues`
    GetTagValues(options: any) {
        let self = this;
        if (this.tagValues.hasOwnProperty(options.key)) {
            return Promise.resolve(this.tagValues[options.key]);
        }
        let key_items = options.key.split('.');
        if (key_items.length < 2 || (key_items.length === 2 && this.datasource.defaultDatabase.length === 0) || key_items.length > 3) {
            return Promise.resolve([]);
        }
        let field, database, table;
        if (key_items.length === 3) {
            [database, table, field] = key_items;
        }
        if (key_items.length === 2) {
            database = self.datasource.defaultDatabase;
            [table, field] = key_items;
        }
        let q = valuesQuery
            .replace('{field}', field)
            .replace('{database}', database)
            .replace('{table}', table);

        return this.datasource.metricFindQuery(q)
            .then(function (response: any) {
                self.tagValues[options.key] = self.processTagValuesResponse(response);
                return self.tagValues[options.key];
            });
    }

    processTagValuesResponse(response: any) {
        let tagValues: any[] = [];
        response.forEach(function (item: any) {
            tagValues.push({text: item.text, value: item.text});
        });
        return Promise.resolve(tagValues);
    }
}
