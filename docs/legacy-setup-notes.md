# Legacy setup notes

Setup notes for old versions of the Altinity ClickHouse datasource plugin for Grafana.

## ClickHouse 25.8+ setup notes for plugin version before 3.4.9
New ClickHouse version change default behavior for output_format_json_quote_64bit_integers=0, 
which not allows to read generated JSON in JavaScript, look details in https://github.com/ClickHouse/ClickHouse/issues/86553
To properly works old version Altinity clickhouse datasource plugin for Grafana use following config
`/etc/clickhouse-server/users.d/output_format_json_quote_64bit_integers.xml`
```xml
<clickhouse><profiles><default>
  <output_format_json_quote_64bit_integers>1</output_format_json_quote_64bit_integers>
</default></profiles></clickhouse>
```

## Grafana 10+ setup notes for plugin version before 3.0.0

Old versions of Altinity ClickHouse datasource plugin for Grafana written in Angular. So you can watch warning like 
```
Angular plugin
This data source plugin uses a deprecated, legacy platform based on AngularJS and will stop working in future releases of Grafana.
```

Don't worry about warning message, plugin will still working until Grafana 11 will release, after it upgrade to Altinity ClickHouse datasource plugin for Grafana to 3.x version is required.
