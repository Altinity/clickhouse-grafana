const columnsQuery = "SELECT database, table, name, type FROM system.columns where database != 'system' ORDER BY database, table";
const regexEnum = /'(?:[^']+|'')+'/gmi;

export default class AdhocCtrl {
    tagKeys: any[];
    tagValues: any[];

    /** @ngInject */
    constructor() {
        this.tagKeys = [];
        this.tagValues = [];
    }

    GetTagKeys(datasource: any){
        var self = this;
        if (this.tagKeys.length > 0) {
            return Promise.resolve(this.tagKeys);
        }
        return datasource.metricFindQuery(columnsQuery)
            .then(function(response){
                response.forEach(function(item){
                   let text = item.database + '.' + item.table + '.' + item.name;
                   let value = item.name;
                   self.tagKeys.push({text: text, value: value});
                   if (item.type.slice(0, 4) === 'Enum') {
                       let options = item.type.match(regexEnum);
                       if (options.length > 0) {
                           self.tagValues[text] = [];
                           options.forEach(function(o) {
                               self.tagValues[text].push({text: o, value: o})
                           })
                       }
                   }
                });
                return Promise.resolve(self.tagKeys);
            });

    }

    GetTagValues(options){
        if (this.tagValues.hasOwnProperty(options.key)) {
            return Promise.resolve(this.tagValues[options.key]);
        }
        return Promise.resolve([])
    }
}