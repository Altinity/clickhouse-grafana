import {isArray} from "lodash";
import {TemplateSrv} from '@grafana/runtime';
import {TimeRange} from "@grafana/data";
import {SqlQueryHelper} from "../../datasource/sql-query/sql-query-helper";

const variableRegex = /\$(\w+)|\[\[([\s\S]+?)(?::(\w+))?\]\]|\${(\w+)(?:\.([^:^\}]+))?(?::([^\}]+))?}/g;
export default class TemplateSrvStub implements TemplateSrv {
    variables: any[] = [];
    templateSettings = {interpolate: /\[\[([\s\S]+?)\]\]/g};
    data: { [key: string]: any } = {};

    getVariables() {
        return this.variables;
    }

    replace(target: string, scopedVars?: { [key: string]: any }, format?: string | Function): string {
        let query = target.replace(variableRegex, (match, var1, var2, fmt2, var3, fieldPath, fmt3) => {
            const variableName = var1 || var2 || var3;
            let variable = this.data[variableName];
            const fmt = fmt2 || fmt3 || format;

            if (scopedVars) {
                let variable = scopedVars[variableName];
                if (variable !== null && variable !== undefined) {
                    let value = scopedVars[variableName].value;
                    return this.formatValue(value, fmt, variable);
                }
            }

            if (!variable) {
                return match;
            }
        });
        return query;
    }

    formatValue(value: any, fmt: any, variable: any) {
        if (typeof fmt === "string" && fmt === 'csv') {
            return isArray(value) ? value.join(',') : value;
        }
        if (typeof fmt === "function") {
            return fmt(value, variable);
        }
        return SqlQueryHelper.clickhouseEscape(value, variable);
    }

    getAdhocFilters() {
        return [];
    }

    variableExists() {
        return false;
    }

    highlightVariablesAsHtml(str: string) {
        return str;
    }

    setGrafanaVariable(name: string, value: string) {
        this.data[name] = value;
    }

    init() {
    }

    fillVariableValuesForUrl() {
    }

    updateTemplateData() {
    }

    updateTimeRange(timeRange: TimeRange) {
    }

    containsTemplate(target?: string): boolean {
        return true;
    }
}
