import React, {useState} from 'react';
import {Button, Label, Modal, RadioButtonGroup} from '@grafana/ui';
import {CHQuery, EditorMode, TimestampFormat} from '../../../../types/types';
import { SelectableValue } from '@grafana/data';
import { E2ESelectors } from '@grafana/e2e-selectors';
import {CHDataSource} from "../../../../datasource/datasource";

const originalJson = {
  name: "Alice",
  age: 25,
  location: "London"
};

const updatedJson = {
  name: "Alice",
  age: 26,
  location: "Manchester",
  profession: "Engineer"
};

// A simple function to find differences
function findDifferences(query, datasource) {
  const {defaultValues} = datasource
  //  {
  //   "dateTime": {
  //     "defaultDateTime": "create_time",
  //     "defaultUint32": "SEQ_IN_INDEX",
  //     "defaultDateDate32": "max_date"
  //   }
  // }

  const differences = [];

  if (defaultValues) {
    if (defaultValues.dateTime.defaultDateDate32 && query.dateColDataType !== defaultValues.dateTime.defaultDateDate32) {
      differences.push({ key: 'Date column', original: String(query.dateColDataType).trim() || 'EMPTY', updated: defaultValues.dateTime.defaultDateDate32 });
    }


    if (query.dateTimeType === 'TIMESTAMP' && defaultValues.dateTime.defaultUint32 && query.dateTimeColDataType !== defaultValues.dateTime.defaultUint32) {
      differences.push({ key: 'Timestamp Column', original: String(query.dateTimeColDataType).trim() || 'EMPTY', updated: defaultValues.dateTime.defaultUint32 });
    }

    if (query.dateTimeType === TimestampFormat.DateTime64 && defaultValues.dateTime.defaultDateTime64 && query.dateTimeColDataType !== defaultValues.dateTime.defaultDateTime64) {
      differences.push({ key: 'Timestamp Column', original: query.dateTimeColDataType || 'EMPTY', updated: defaultValues.dateTime.defaultDateTime64 });
    }

    if (query.dateTimeType === TimestampFormat.DateTime && defaultValues.dateTime.defaultDateTime && query.dateTimeColDataType !== defaultValues.dateTime.defaultDateTime) {
      differences.push({ key: 'Timestamp Column', original: query.dateTimeColDataType || 'EMPTY', updated: defaultValues.dateTime.defaultDateTime });
    }
  }

  return differences;
}

export const Components = {
  QueryEditor: {
    EditorMode: {
      options: {
        QuerySettings: 'Query Settings',
        SQLEditor: 'SQL Editor',
      },
    },
  },
};

export const selectors: { components: E2ESelectors<typeof Components> } = {
  components: Components,
};
interface QueryHeaderProps {
  isAnnotationView: boolean;
  query: CHQuery;
  editorMode: EditorMode;
  setEditorMode: (mode: any) => void;
  onTriggerQuery: () => void;
  datasource: CHDataSource;
}

export const QueryHeader = ({ editorMode, setEditorMode, isAnnotationView, onTriggerQuery, datasource, query}: QueryHeaderProps) => {
  const [modalOpen, setModalOpen] = useState(false)
  const options: Array<SelectableValue<EditorMode>> = [
    { label: selectors.components.QueryEditor.EditorMode.options.QuerySettings, value: EditorMode.Builder },
    { label: selectors.components.QueryEditor.EditorMode.options.SQLEditor, value: EditorMode.SQL },
  ];


  console.log(query, datasource)

  const onEditorModeChange = (editorMode: EditorMode) => {
    setEditorMode(editorMode);
  };

  const differences = findDifferences(query, datasource);

  return (
    <div style={{display: "flex", marginTop: "10px"}}>
      <RadioButtonGroup
        size="sm"
        options={options}
        value={editorMode}
        onChange={(e: EditorMode) => onEditorModeChange(e!)}
      />
      { (editorMode === EditorMode.SQL && !isAnnotationView) ? <Button variant="primary" icon="play" size={'sm'} style={{marginLeft: '10px'}} onClick={onTriggerQuery}>
        Run Query
      </Button> : null }
      { editorMode === EditorMode.Builder ? <>
        <Button variant="primary" size={'sm'} icon="arrow-right"  style={{marginLeft: '10px'}} onClick={() => setEditorMode(EditorMode.SQL)} >
          Go to Query
        </Button>
        <Button variant="primary" size={'sm'} icon="sync"  style={{marginLeft: '10px'}} onClick={() => setModalOpen(true)} >
          Override settings
        </Button>
      </>: null }
      <Modal title={'Confirmation'} isOpen={modalOpen} onClickBackdrop={() => setModalOpen(false)} onDismiss={() => setModalOpen(false)}>
        <div>
          <p>Configuration will be reset to default values defined in datasource configuration</p>
          {differences.map(item => <Label style={{fontSize: '16px'}} children={item.key} description={`${item.original}  ---->  ${item.updated}`} />)}

        </div>
        <Modal.ButtonRow>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => setModalOpen(false)}>Confirm</Button>
        </Modal.ButtonRow>
      </Modal>
    </div>
  );
};
