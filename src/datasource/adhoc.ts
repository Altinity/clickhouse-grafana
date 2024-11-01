const DEFAULT_VALUES_QUERY = 'SELECT DISTINCT {field} AS value FROM {database}.{table} LIMIT 300';
export default class AdHocFilter {
  tagKeys: any[];
  tagValues: { [key: string]: any } = {};
  datasource: any;
  query: string;
  adHocValuesQuery: string;

  constructor(datasource: any) {
    const queryFilter = "database NOT IN ('system','INFORMATION_SCHEMA','information_schema')";
    const columnsQuery =
      'SELECT database, table, name, type FROM system.columns WHERE {filter} ORDER BY database, table';

    this.tagKeys = [];
    this.tagValues = [];
    this.datasource = datasource;
    this.adHocValuesQuery = datasource.adHocValuesQuery
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
    return this.datasource.metricFindQuery(q).then(function (response: any) {
      return self.processTagKeysResponse(response);
    });
  }

  processTagKeysResponse(response: any): Promise<any[]> {
    const columnNames: { [key: string]: boolean } = {};

    response.forEach((item: any) => {
      const databasePrefix = this.datasource.defaultDatabase.length === 0 ? item.database + '.' : '';
      const text: string = databasePrefix + item.table + '.' + item.name;
      const value = item.name;

      this.tagKeys.push({ text, value });

      if (item.type.slice(0, 4) === 'Enum') {
        const regexEnum = /'(?:[^']+|'')+'/gim;
        const options = item.type.match(regexEnum) || [];

        if (options.length > 0) {
          this.tagValues[text] = options.map((o: any) => ({ text: o, value: o }));
          this.tagValues[item.name] = this.tagValues[text];
        }
      }

      columnNames[item.name] = true;
    });

    // Store unique column names with wildcard table
    Object.keys(columnNames).forEach((columnName) => {
      this.tagKeys.push({ text: columnName, value: columnName });
    });

    return Promise.resolve(this.tagKeys);
  }

  // GetTagValues returns column values according to passed options
  // Values for fields with Enum type were already fetched in GetTagKeys func and stored in `tagValues`
  // Values for fields which not represented on `tagValues` get from ClickHouse and cached on `tagValues`
  GetTagValues(options) {
    // Determine which query to use initially
    const initialQuery = this.adHocValuesQuery || DEFAULT_VALUES_QUERY;

    // If the tag values are already cached, return them immediately
    if (Object.prototype.hasOwnProperty.call(this.tagValues, options.key)) {
      return Promise.resolve(this.tagValues[options.key]);
    }

    // Split the key to extract database, table, and field
    const keyItems = options.key.split('.');
    if (
      keyItems.length < 2 ||
      (keyItems.length === 2 && !this.datasource.defaultDatabase) ||
      keyItems.length > 3
    ) {
      return Promise.resolve([]);
    }

    // Destructure key items based on their length
    let database, table, field;
    if (keyItems.length === 3) {
      [
        database,
        table,
        field] = keyItems;
    } else {
      database = this.datasource.defaultDatabase;
      [table, field] = keyItems;
    }

    // Function to build the query
    const buildQuery = (queryTemplate) =>
      queryTemplate
        .replace('{field}', field)
        .replace('{database}', database)
        .replace('{table}', table);

    // Execute the initial query
    return this.datasource.metricFindQuery(buildQuery(initialQuery))
      .then((response: any) => {
        // Process and cache the response
        this.tagValues[options.key] = this.processTagValuesResponse(response);
        return this.tagValues[options.key];
      })
      .catch((error: any) => {
        // If the initial query wasn't the default, attempt the fallback
        if (initialQuery !== DEFAULT_VALUES_QUERY) {
          const fallbackQuery = buildQuery(DEFAULT_VALUES_QUERY);
          return this.datasource.metricFindQuery(fallbackQuery)
            .then((fallbackResponse: any) => {
              // Process and cache the fallback response
              this.tagValues[options.key] = this.processTagValuesResponse(fallbackResponse);
              return this.tagValues[options.key];
            })
            .catch((fallbackError: any) => {
              this.tagValues[options.key] = [];
              return this.tagValues[options.key];
            });
        } else {
          this.tagValues[options.key] = [];
          return this.tagValues[options.key];
        }
      });
  }

  processTagValuesResponse(response: any) {
    const tagValues = response.map((item: any) => ({ text: item.text, value: item.text }));
    return Promise.resolve(tagValues);
  }
}
