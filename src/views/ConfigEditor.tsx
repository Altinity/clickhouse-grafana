import React from 'react';
import {InlineField, Input, Switch, SecretInput, DataSourceHttpSettings} from '@grafana/ui';
import {
  DataSourcePluginOptionsEditorProps, onUpdateDatasourceJsonDataOption, onUpdateDatasourceSecureJsonDataOption,
} from '@grafana/data';
import {CHDataSourceOptions, CHSecureJsonData} from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<CHDataSourceOptions> {
}

export function ConfigEditor(props: Props) {
  const {onOptionsChange, options} = props;

  console.log(options);
  const onSwitchToggle = (
    key: keyof Pick<CHDataSourceOptions, 'useYandexCloudAuthorization' | 'addCorsHeader' | 'usePOST'>,
    value: boolean
  ) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        [key]: value,
      },
    });
  };

  const onResetXHeaderKey = () => {
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...options.secureJsonFields,
        xHeaderKey: false,
      },
      secureJsonData: {
        ...options.secureJsonData,
        xHeaderKey: '',
      },
    });
  };
  const {jsonData, secureJsonFields} = options;
  const secureJsonData = (options.secureJsonData || {}) as CHSecureJsonData;

  return (
    <>
      <DataSourceHttpSettings defaultUrl="http://localhost:8123" dataSourceConfig={options}
                              showAccessOptions={true}
                              onChange={onOptionsChange}/>
      <div className="gf-form-group">
        <InlineField label="Use Yandex.Cloud authorization headers"
               tooltip="Use authorization headers for managed Yandex.Cloud ClickHouse database">
          <Switch
            id="useYandexCloudAuthorization"
            className="gf-form"
            value={jsonData.useYandexCloudAuthorization || false}
            onChange={(e) => onSwitchToggle('useYandexCloudAuthorization', e.currentTarget.checked)}
          />
        </InlineField>
        {jsonData.useYandexCloudAuthorization && (
          <>
            <InlineField label="X-ClickHouse-User">
              <Input id="xHeaderUser" onChange={onUpdateDatasourceJsonDataOption(props, 'xHeaderUser')}
                     value={jsonData.xHeaderUser || ''} placeholder="DB user name"/>
            </InlineField>
            <InlineField label="X-ClickHouse-Key">
              <SecretInput
                isConfigured={(secureJsonFields && secureJsonFields.xHeaderKey) as boolean}
                value={secureJsonData.xHeaderKey || ''}
                placeholder="DB user password"
                onReset={onResetXHeaderKey}
                onChange={onUpdateDatasourceSecureJsonDataOption(props, 'xHeaderKey')}
              />
            </InlineField>
          </>
        )}
      </div>
      <h3 className="page-heading">Additional</h3>
      <div className="gf-form-group">
        <InlineField label="Add CORS flag to requests"
                     labelWidth={32}
                     tooltip="Whether 'add_http_cors_header=1' parameter should be attached to requests. Remember that read-only users cannot override this setting.">
          <Switch
            id="addCorsHeader"
            className="gf-form"
            value={jsonData.addCorsHeader || false}
            onChange={(e) => onSwitchToggle('addCorsHeader', e.currentTarget.checked)}
          />
        </InlineField>
        <InlineField label="Use POST method to send queries"
                     labelWidth={32}
                     tooltip="Remember that it's possible to change data via POST requests. Better to avoid using POST method if you connecting not as Read-Only user.">
          <Switch
            id="usePOST"
            className="gf-form"
            value={jsonData.usePOST || false}
            onChange={(e) => onSwitchToggle('usePOST', e.currentTarget.checked)}
          />
        </InlineField>
        <InlineField label="Default database" labelWidth={32}
               tooltip="If you set default database for this datasource, it will be prefilled in the query builder, and used to make ad-hoc filters more convenient.">
          <Input value={jsonData.defaultDatabase || 'default'} placeholder="default"
                 onChange={onUpdateDatasourceJsonDataOption(props, 'defaultDatabase')}/>
        </InlineField>
      </div>
    </>
  );
}
