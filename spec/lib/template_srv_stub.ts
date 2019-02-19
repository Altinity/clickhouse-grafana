import {template} from 'lodash-es';

export default class TemplateSrvStub {
  variables = [];
  templateSettings = { interpolate : /\[\[([\s\S]+?)\]\]/g };
  data = {};

  replace(text) {
    return template(text, this.templateSettings)(this.data);
  }

  getAdhocFilters() {
    return [];
  }

  variableExists() {
    return false;
  }

  highlightVariablesAsHtml(str) {
    return str;
  }

  setGrafanaVariable(name, value) {
    this.data[name] = value;
  }

  init() {}
  fillVariableValuesForUrl() {}
  updateTemplateData() {}
}
