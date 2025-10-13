import { DataLink } from '@grafana/data';
import { BaseLinkBuilder } from '../BaseLinkBuilder';
import { DataLinksConfig, TableLinkContext } from '../types';

/**
 * Link builder for table format
 * Generates links for table cells/rows
 */
export class TableLinkBuilder extends BaseLinkBuilder<TableLinkContext> {
  constructor(config: DataLinksConfig) {
    super(config, 'table');
  }

  /**
   * Build links for a table cell
   */
  public buildLinks(context: TableLinkContext): DataLink[] {
    if (!this.isEnabled()) {
      return [];
    }

    // Check if this column should have links
    if (!this.isFieldLinkable(context.columnName)) {
      return [];
    }

    const links: DataLink[] = [];
    const templates = this.getQueryTemplates();

    if (templates.length > 0) {
      // Use configured query templates
      templates.forEach((template) => {
        const link = this.buildDataLink(template, context);
        links.push(link);
      });
    } else {
      // Build default link
      links.push(this.buildDefaultLink(context, 'table'));
    }

    return links;
  }

  /**
   * Build default query for table
   */
  protected buildDefaultQuery(whereClause: string, context: TableLinkContext): string {
    // Build query based on primary key or first column
    const primaryColumn = context.columnName;
    const primaryValue = context.columnValue;

    return `
SELECT * FROM data
WHERE ${primaryColumn} = ${
      typeof primaryValue === 'string' ? `'${primaryValue.replace(/'/g, "''")}'` : primaryValue
    }
LIMIT 100
    `.trim();
  }

  /**
   * Get default link title
   */
  protected getDefaultLinkTitle(context: TableLinkContext): string {
    return `View Details`;
  }

  /**
   * Check if column is linkable based on configuration
   */
  public isColumnLinkable(columnName: string): boolean {
    return this.isFieldLinkable(columnName);
  }

  /**
   * Create link context from table row
   */
  public static createContext(row: Record<string, any>, columnName: string, rowIndex: number): TableLinkContext {
    return {
      row,
      columnName,
      columnValue: row[columnName],
      rowIndex,
      labels: row,
      values: row,
      metadata: {
        rowIndex,
        columnName,
      },
    };
  }
}
