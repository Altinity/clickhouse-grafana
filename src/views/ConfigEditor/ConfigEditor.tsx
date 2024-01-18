import React, {FormEvent} from 'react';
import { DataSourceHttpSettings, InlineField, InlineSwitch, Input, SecretInput } from '@grafana/ui';
import {
  DataSourcePluginOptionsEditorProps,
  onUpdateDatasourceJsonDataOption,
} from '@grafana/data';
import { CHDataSourceOptions } from '../../types/types';

export interface CHSecureJsonData {
  password?: string;
  xHeaderKey?: string;
}

interface Props extends DataSourcePluginOptionsEditorProps<CHDataSourceOptions> {}

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData, secureJsonFields } = options;
  const secureJsonData = (options.secureJsonData || {}) as CHSecureJsonData;

  const onSwitchToggle = (
    key: keyof Pick<CHDataSourceOptions, 'useYandexCloudAuthorization' | 'addCorsHeader' | 'usePOST'>,
    value: boolean
  ) => {
    onOptionsChange({
      ...options,
      jsonData: { ...jsonData, [key]: value },
    });
  };

  const onResetSecureJsonField = (field: keyof CHSecureJsonData) => {
    const newSecureJsonFields = { ...secureJsonFields, [field]: false };
    const newSecureJsonData = { ...secureJsonData, [field]: '' };
    onOptionsChange({
      ...options,
      secureJsonFields: newSecureJsonFields,
      secureJsonData: newSecureJsonData,
    });
  };

  const onChangeSecureJsonField = (field: keyof CHSecureJsonData, event: FormEvent<HTMLInputElement>) => {
    const newSecureJsonFields = { ...secureJsonFields, [field]: true };
    const newSecureJsonData = { ...secureJsonData, [field]: event.currentTarget.value };
    onOptionsChange({
      ...options,
      secureJsonFields: newSecureJsonFields,
      secureJsonData: newSecureJsonData,
    });
  };

  return (
    <>
      <DataSourceHttpSettings
        defaultUrl="http://localhost:8123"
        dataSourceConfig={options}
        showAccessOptions={true}
        showForwardOAuthIdentityOption={true}
        onChange={onOptionsChange}
      />
      <div className="gf-form-group">
        <InlineField
          label="Use Yandex.Cloud authorization headers"
          tooltip="Use authorization headers for managed Yandex.Cloud ClickHouse database, will work only for proxy access method"
          labelWidth={36}
        >
          <InlineSwitch
            id="useYandexCloudAuthorization"
            className="gf-form"
            value={jsonData.useYandexCloudAuthorization || false}
            onChange={(e) => onSwitchToggle('useYandexCloudAuthorization', e.currentTarget.checked)}
          />
        </InlineField>
        {jsonData.useYandexCloudAuthorization && (
          <>
            <InlineField label="X-ClickHouse-User" labelWidth={36}>
              <Input
                id="xHeaderUser"
                onChange={onUpdateDatasourceJsonDataOption(props, 'xHeaderUser')}
                value={jsonData.xHeaderUser || ''}
                placeholder="DB user name"
              />
            </InlineField>
            <InlineField label={'X-ClickHouse-Key'} labelWidth={36}>
              <SecretInput
                isConfigured={!!secureJsonFields?.['xHeaderKey']}
                value={secureJsonData['xHeaderKey'] || ''}
                placeholder={`DB user password`}
                onReset={() => onResetSecureJsonField('xHeaderKey')}
                onChange={(event) => onChangeSecureJsonField('xHeaderKey', event)}
              />
            </InlineField>
          </>
        )}
      </div>
      <h3 className="page-heading">Additional</h3>
      <div className="gf-form-group">
        <InlineField
          label="Add CORS flag to requests"
          labelWidth={36}
          tooltip="Whether 'add_http_cors_header=1' parameter should be attached to requests. Remember that read-only users cannot override this setting."
        >
          <InlineSwitch
            id="addCorsHeader"
            className="gf-form"
            value={jsonData.addCorsHeader || false}
            onChange={(e) => onSwitchToggle('addCorsHeader', e.currentTarget.checked)}
          />
        </InlineField>
        <InlineField
          label="Use POST method to send queries"
          labelWidth={36}
          tooltip="Remember that it's possible to change data via POST requests. Better to avoid using POST method if you connecting not as Read-Only user."
        >
          <InlineSwitch
            id="usePOST"
            className="gf-form"
            value={jsonData.usePOST || false}
            onChange={(e) => onSwitchToggle('usePOST', e.currentTarget.checked)}
          />
        </InlineField>
        <InlineField
          label="Default database"
          labelWidth={36}
          tooltip="If you set the default database for this datasource, it will be prefilled in the query builder, and used to make ad-hoc filters more convenient."
        >
          <Input
            value={jsonData.defaultDatabase || 'default'}
            placeholder="default"
            onChange={onUpdateDatasourceJsonDataOption(props, 'defaultDatabase')}
          />
        </InlineField>
      </div>
    </>
  );
}
