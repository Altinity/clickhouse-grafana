import React, { useEffect, useState } from 'react';
import { Button, Modal, RadioButtonGroup, useStyles2 } from '@grafana/ui';
import { GrafanaTheme2 } from '@grafana/data';
import { css } from '@emotion/css';
import { CHQuery, LogsFieldConfigEntry, LogsFieldMode } from '../../../../../../types/types';
import {
  isComplexType,
  defaultModeForType,
  renderFieldByMode,
  DEFAULT_EXPAND_DEPTH,
  typeHasNesting,
} from '../../../../../../datasource/sql-series/logsFieldModes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  isOpen: boolean;
  onDismiss: () => void;
  query: CHQuery;
  datasource: any;
  // Called on Save with the merged per-field config only — the modal owns no
  // other part of the query, so the contract is intentionally narrow.
  onChange: (logsFieldConfig: Record<string, LogsFieldConfigEntry>) => void;
}

type PreviewNode = { key: string; value?: string; children?: PreviewNode[] };

type TreeStyles = {
  treeNode: string;
  treeBranchLabel: string;
  previewKey: string;
  previewValue: string;
};

// ---------------------------------------------------------------------------
// Pure helpers (module level)
// ---------------------------------------------------------------------------

/**
 * Build a tree from a sample value, expanding plain objects up to `levelsLeft`
 * levels.  At the depth limit, or for arrays, the value becomes a stringified
 * leaf.
 */
const buildPreviewTree = (value: any, levelsLeft: number): PreviewNode[] => {
  if (value && typeof value === 'object' && !Array.isArray(value) && levelsLeft > 0) {
    return Object.keys(value).map((k) => {
      const child = value[k];
      if (child && typeof child === 'object' && !Array.isArray(child) && levelsLeft - 1 > 0) {
        return { key: k, children: buildPreviewTree(child, levelsLeft - 1) };
      }
      const leaf = child && typeof child === 'object' ? JSON.stringify(child) : String(child);
      return { key: k, value: leaf };
    });
  }
  // Whole value is a leaf (array, primitive, or depth === 0).
  return [{ key: '', value: value && typeof value === 'object' ? JSON.stringify(value) : String(value) }];
};

const renderTreeNodes = (nodes: PreviewNode[], s: TreeStyles): React.ReactNode =>
  nodes.map((node, idx) => {
    if (node.children) {
      return (
        <div key={idx}>
          <span className={s.treeBranchLabel}>{node.key}</span>
          <div className={s.treeNode}>{renderTreeNodes(node.children, s)}</div>
        </div>
      );
    }
    return (
      <div key={idx}>
        {node.key ? (
          <>
            <span className={s.previewKey}>{node.key}</span>
            <span> = </span>
          </>
        ) : null}
        <span className={s.previewValue}>{truncate(node.value ?? '')}</span>
      </div>
    );
  });

const modeOptionsForType = (chType: string): Array<{ label: string; value: LogsFieldMode }> => {
  const flatten: { label: string; value: LogsFieldMode } =
    defaultModeForType(chType) === 'single'
      ? { label: 'Single', value: 'single' }
      : { label: 'Expand', value: 'expand' };
  return [flatten, { label: 'Hide', value: 'hide' }, { label: 'Raw (body)', value: 'raw' }];
};

const esc = (s: string) => String(s).replace(/'/g, "''");
const escId = (s: string) => '`' + String(s).replace(/`/g, '``') + '`';

const TRUNCATE_LEN = 80;
const truncate = (s: string): string =>
  s.length > TRUNCATE_LEN ? s.slice(0, TRUNCATE_LEN) + '…' : s;

// Depth options: 1–4 + All (64 is a finite "all levels" sentinel; JSON-serializable).
const DEPTH_OPTIONS: Array<{ label: string; value: number }> = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: 'All', value: 64 },
];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const getStyles = (theme: GrafanaTheme2) => {
  const radius =
    (theme.shape as any).radius?.default ??
    (theme.shape as any).borderRadius ??
    '4px';

  return {
    legend: css`
      color: ${theme.colors.text.secondary};
      font-size: ${theme.typography.bodySmall.fontSize};
      margin-bottom: ${theme.spacing(1.5)};
    `,
    fieldCard: css`
      background: ${theme.colors.background.secondary};
      border: 1px solid ${theme.colors.border.weak};
      border-radius: ${radius};
      padding: ${theme.spacing(1, 1.5)};
      margin-bottom: ${theme.spacing(1)};
    `,
    cardHeader: css`
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: ${theme.spacing(1)};
    `,
    cardHeaderLeft: css`
      display: flex;
      align-items: center;
      gap: ${theme.spacing(1)};
      min-width: 0;
    `,
    /** Right-side cluster: mode selector + inline depth selector. */
    cardControls: css`
      display: flex;
      align-items: center;
      gap: ${theme.spacing(1)};
      flex-wrap: wrap;
    `,
    fieldName: css`
      color: ${theme.colors.text.primary};
      font-weight: ${theme.typography.fontWeightMedium};
    `,
    typeChip: css`
      font-family: ${theme.typography.fontFamilyMonospace};
      font-size: ${theme.typography.bodySmall.fontSize};
      color: ${theme.colors.text.secondary};
      background: ${theme.colors.background.primary};
      border: 1px solid ${theme.colors.border.weak};
      border-radius: ${radius};
      padding: ${theme.spacing(0.125, 0.5)};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 320px;
    `,
    modifiedBadge: css`
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${theme.colors.primary.main};
      flex-shrink: 0;
    `,
    resetRow: css`
      display: flex;
      justify-content: flex-start;
      margin-top: ${theme.spacing(0.5)};
    `,
    depthLabel: css`
      font-size: ${theme.typography.bodySmall.fontSize};
      color: ${theme.colors.text.secondary};
    `,
    previewPanel: css`
      background: ${theme.colors.background.primary};
      border: 1px solid ${theme.colors.border.weak};
      border-radius: ${radius};
      padding: ${theme.spacing(0.75, 1)};
      margin-top: ${theme.spacing(1)};
      font-family: ${theme.typography.fontFamilyMonospace};
      font-size: ${theme.typography.bodySmall.fontSize};
      line-height: 1.5;
      max-height: 180px;
      overflow-y: auto;
    `,
    previewKey: css`
      color: ${theme.colors.text.secondary};
    `,
    previewValue: css`
      color: ${theme.colors.text.primary};
    `,
    previewMuted: css`
      color: ${theme.colors.text.disabled};
      font-style: italic;
    `,
    /** Indented container for each tree level, with a faint left-border branch guide. */
    treeNode: css`
      padding-left: ${theme.spacing(2)};
      border-left: 1px solid ${theme.colors.border.weak};
    `,
    /** Branch label (object key that has nested children). */
    treeBranchLabel: css`
      color: ${theme.colors.text.secondary};
      font-weight: ${theme.typography.fontWeightMedium};
    `,
  };
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AdvancedLogsFieldsModal: React.FC<Props> = ({ isOpen, onDismiss, query, datasource, onChange }) => {
  const styles = useStyles2(getStyles);
  const [columns, setColumns] = useState<Array<{ name: string; type: string }>>([]);
  const [config, setConfig] = useState<Record<string, LogsFieldConfigEntry>>(query.logsFieldConfig || {});
  const [sample, setSample] = useState<Record<string, any>>({});
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const initialConfigRef = React.useRef<string>(JSON.stringify(query.logsFieldConfig || {}));

  useEffect(() => {
    if (isOpen) {
      const initial = query.logsFieldConfig || {};
      setConfig(initial);
      initialConfigRef.current = JSON.stringify(initial);
    }
  }, [isOpen, query.logsFieldConfig]);

  useEffect(() => {
    if (!isOpen || !query.database || !query.table) {
      return;
    }
    const sql = `SELECT name, type FROM system.columns WHERE database = '${esc(query.database)}' AND table = '${esc(query.table)}' ORDER BY position`;
    setFieldsLoading(true);
    datasource
      .metricFindQuery(sql)
      .then((rows: any[]) => {
        const parsed = (rows || []).map((r) => ({
          name: r.text ?? r.name,
          type: String(r.value ?? r.type ?? ''),
        }));
        const complexCols = parsed.filter((c) => isComplexType(c.type));
        setColumns(complexCols);
        setFieldsLoading(false);
        return complexCols;
      })
      .then((complexCols: Array<{ name: string; type: string }>) => {
        if (complexCols.length === 0) {
          return;
        }
        // Single cheap query: one row, one JSON-encoded value per complex
        // column, instead of N unbounded `any(...)` full-table aggregations
        // joined with UNION ALL.
        const selectList = complexCols
          .map((c) => `toJSONString(${escId(c.name)}) AS ${escId(c.name)}`)
          .join(', ');
        const sampleSql = `SELECT ${selectList} FROM ${escId(query.database!)}.${escId(query.table!)} LIMIT 1`;
        setSampleLoading(true);
        return datasource
          .metricFindQuery(sampleSql)
          .then((sampleRows: any[]) => {
            const result: Record<string, any> = {};
            const row = (sampleRows || [])[0];
            if (row) {
              const singleColumn = complexCols.length === 1;
              for (const c of complexCols) {
                let rawVal = row[c.name];
                if (rawVal === undefined && singleColumn && row.text !== undefined) {
                  // With exactly one selected column the shared ResponseParser
                  // collapses the row object to {text: value} instead of
                  // {[alias]: value} — fall back to that shape.
                  rawVal = row.text;
                }
                if (rawVal === undefined) {
                  continue;
                }
                try {
                  result[c.name] = JSON.parse(rawVal);
                } catch {
                  // skip columns that fail to parse
                }
              }
            }
            setSample(result);
          })
          .catch(() => {
            /* leave sample empty */
          })
          .finally(() => setSampleLoading(false));
      })
      .catch(() => {
        setColumns([]);
        setFieldsLoading(false);
      });
  }, [isOpen, query.database, query.table, datasource]);

  // -------------------------------------------------------------------------
  // Per-field helpers
  // -------------------------------------------------------------------------

  const modeFor = (col: { name: string; type: string }): LogsFieldMode =>
    config[col.name]?.mode ?? defaultModeForType(col.type) ?? 'expand';

  const depthFor = (col: { name: string }): number =>
    config[col.name]?.depth ?? DEFAULT_EXPAND_DEPTH;

  const setMode = (name: string, mode: LogsFieldMode) =>
    setConfig((prev) => ({ ...prev, [name]: { ...prev[name], mode } }));

  const setDepth = (name: string, depth: number) =>
    setConfig((prev) => ({
      ...prev,
      [name]: { mode: prev[name]?.mode ?? 'expand', depth },
    }));

  const isModified = (col: { name: string; type: string }): boolean => {
    const mode = modeFor(col);
    const defaultMode = defaultModeForType(col.type) ?? 'expand';
    if (mode !== defaultMode) {
      return true;
    }
    return mode === 'expand' && depthFor(col) !== DEFAULT_EXPAND_DEPTH;
  };

  const resetToDefaults = () => setConfig({});

  const isDirty = JSON.stringify(config) !== initialConfigRef.current;

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  const save = () => {
    const merged: Record<string, LogsFieldConfigEntry> = { ...config };
    for (const col of columns) {
      const mode = modeFor(col);
      if (mode === 'expand') {
        // Persist depth alongside mode for expand entries.
        merged[col.name] = { mode, depth: depthFor(col) };
      } else {
        // Non-expand modes do not carry a depth property.
        merged[col.name] = { mode };
      }
    }
    onChange(merged);
    onDismiss();
  };

  // -------------------------------------------------------------------------
  // Preview rendering (tree-style for expand, flat for single/raw/hide)
  // -------------------------------------------------------------------------

  const renderPreview = (col: { name: string; type: string }): React.ReactNode => {
    const mode = modeFor(col);
    let content: React.ReactNode;

    if (sample[col.name] === undefined) {
      // Loading / no-data states
      content = (
        <span className={styles.previewMuted}>{sampleLoading ? 'Loading preview…' : 'no sample data'}</span>
      );
    } else if (mode === 'hide') {
      content = <span className={styles.previewMuted}>Hidden — not shown in log details</span>;
    } else if (mode === 'raw') {
      const r = renderFieldByMode(col.name, sample[col.name], mode);
      content = (
        <span className={styles.previewMuted}>→ appended to message body: {truncate(r.bodyAppend ?? '')}</span>
      );
    } else if (mode === 'single') {
      // Flat leaf: colName = <value>
      const v = sample[col.name];
      const strVal = v && typeof v === 'object' ? JSON.stringify(v) : String(v);
      content = (
        <div>
          <span className={styles.previewKey}>{col.name}</span>
          <span> = </span>
          <span className={styles.previewValue}>{truncate(strVal)}</span>
        </div>
      );
    } else {
      // Expand mode — indented tree, honouring per-field depth. The column
      // name is already shown in the card header; the tree starts from the
      // top-level keys of the sample value.
      content = renderTreeNodes(buildPreviewTree(sample[col.name], depthFor(col)), styles);
    }

    return <div className={styles.previewPanel}>{content}</div>;
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Modal title="Advanced log fields settings" isOpen={isOpen} onDismiss={onDismiss} onClickBackdrop={onDismiss}>
      <div className={styles.legend}>
        Expand: one label per (nested) key · Single: whole value · Hide: not shown · Raw: into message body
      </div>
      {fieldsLoading && (
        <div className={styles.previewMuted} data-testid="fields-loading">
          Loading fields…
        </div>
      )}
      {!fieldsLoading && columns.length === 0 && (
        <div>No complex fields detected (set database and table).</div>
      )}
      {columns.map((col) => (
        <div key={col.name} data-testid={`field-card-${col.name}`} className={styles.fieldCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <span className={styles.fieldName}>{col.name}</span>
              {isModified(col) && (
                <span
                  className={styles.modifiedBadge}
                  title="modified"
                  aria-label="modified"
                  data-testid={`modified-badge-${col.name}`}
                />
              )}
              <span className={styles.typeChip}>{col.type}</span>
            </div>
            <div className={styles.cardControls}>
              <RadioButtonGroup
                size="sm"
                options={modeOptionsForType(col.type)}
                value={modeFor(col)}
                onChange={(v) => setMode(col.name, v as LogsFieldMode)}
              />
              {/* Depth selector — inline, only for expand mode on types that can actually nest deeper */}
              {modeFor(col) === 'expand' && typeHasNesting(col.type) && (
                <>
                  <span className={styles.depthLabel}>Depth</span>
                  <RadioButtonGroup
                    size="sm"
                    options={DEPTH_OPTIONS}
                    value={depthFor(col)}
                    onChange={(v) => setDepth(col.name, Number(v))}
                  />
                </>
              )}
            </div>
          </div>

          {renderPreview(col)}
        </div>
      ))}
      <div className={styles.resetRow}>
        <Button size="sm" variant="destructive" fill="text" onClick={resetToDefaults}>
          Reset to defaults
        </Button>
      </div>
      <Modal.ButtonRow>
        <Button variant="secondary" onClick={onDismiss}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save} disabled={!isDirty}>
          Save
        </Button>
      </Modal.ButtonRow>
    </Modal>
  );
};
