///<reference path="../../../headers/common.d.ts" />

import _ from 'lodash';

var index = [];
var categories = {
  Aggregations: [],
  Selectors: [],
  Fields: [],
};

class QueryPartDef {
  type: string;
  params: any[];
  defaultParams: any[];
  renderer: any;
  category: any;
  addStrategy: any;

  constructor(options: any) {
    this.type = options.type;
    this.params = options.params;
    this.defaultParams = options.defaultParams;
    this.renderer = options.renderer;
    this.category = options.category;
    this.addStrategy = options.addStrategy;
  }

  static register(options: any) {
    index[options.type] = new QueryPartDef(options);
    options.category.push(index[options.type]);
  }
}

function functionRenderer(part, innerExpr) {
  var str = part.def.type + '(';
  var parameters = _.map(part.params, (value, index) => {
    return value;
  });

  if (innerExpr) {
    parameters.unshift(innerExpr);
  }
  return str + parameters.join(', ') + ')';
}

function suffixRenderer(part, innerExpr) {
  return innerExpr + ' ' + part.params[0];
}

function identityRenderer(part, innerExpr) {
  return part.params[0];
}

function quotedIdentityRenderer(part, innerExpr) {
  return '"' + part.params[0] + '"';
}

function fieldRenderer(part, innerExpr) {
  return part.params[0];
}

function replaceAggregationAddStrategy(selectParts, partModel) {
  // look for existing aggregation
  for (var i = 0; i < selectParts.length; i++) {
    var part = selectParts[i];
    if (part.def.category === categories.Aggregations) {
      selectParts[i] = partModel;
      return;
    }
    if (part.def.category === categories.Selectors) {
      selectParts[i] = partModel;
      return;
    }
  }

  selectParts.splice(1, 0, partModel);
}

function addFieldStrategy(selectParts, partModel, query) {
  // copy all parts
  var parts = _.map(selectParts, function(part: any) {
    return new QueryPart({type: part.def.type, params: _.clone(part.params)});
  });

  query.selectModels.push(parts);
}

// Aggregations
QueryPartDef.register({
  type: 'count',
  addStrategy: replaceAggregationAddStrategy,
  category: categories.Aggregations,
  params: [],
  defaultParams: [],
  renderer: functionRenderer,
});

QueryPartDef.register({
  type: 'avg',
  addStrategy: replaceAggregationAddStrategy,
  category: categories.Aggregations,
  params: [],
  defaultParams: [],
  renderer: functionRenderer,
});

QueryPartDef.register({
  type: 'sum',
  addStrategy: replaceAggregationAddStrategy,
  category: categories.Aggregations,
  params: [],
  defaultParams: [],
  renderer: functionRenderer,
});

// Selectors

QueryPartDef.register({
  type: 'max',
  addStrategy: replaceAggregationAddStrategy,
  category: categories.Selectors,
  params: [],
  defaultParams: [],
  renderer: functionRenderer,
});

QueryPartDef.register({
  type: 'min',
  addStrategy: replaceAggregationAddStrategy,
  category: categories.Selectors,
  params: [],
  defaultParams: [],
  renderer: functionRenderer,
});

QueryPartDef.register({
    type: 'field',
    addStrategy: addFieldStrategy,
    category: categories.Fields,
    params: [{type: 'field', dynamicLookup: true}],
    defaultParams: ['value'],
    renderer: fieldRenderer,
});

QueryPartDef.register({
  type: 'tag',
  category: [],
  params: [{name: 'tag', type: 'string', dynamicLookup: true}],
  defaultParams: ['tag'],
  renderer: fieldRenderer,
});

class QueryPart {
  part: any;
  def: QueryPartDef;
  params: any[];
  text: string;

  constructor(part: any) {
    this.part = part;
    this.def = index[part.type];
    if (!this.def) {
      throw {message: 'Could not find query part ' + part.type};
    }

    part.params = part.params || _.clone(this.def.defaultParams);
    this.params = part.params;
    this.updateText();
  }

  render(innerExpr: string) {
    return this.def.renderer(this, innerExpr);
  }

  hasMultipleParamsInString (strValue, index) {
    if (strValue.indexOf(',') === -1) {
      return false;
    }

    return this.def.params[index + 1] && this.def.params[index + 1].optional;
  }

  updateParam (strValue, index) {
    // handle optional parameters
    // if string contains ',' and next param is optional, split and update both
    if (this.hasMultipleParamsInString(strValue, index)) {
      _.each(strValue.split(','), function(partVal: string, idx) {
        this.updateParam(partVal.trim(), idx);
      }, this);
      return;
    }

    if (strValue === '' && this.def.params[index].optional) {
      this.params.splice(index, 1);
    } else {
      this.params[index] = strValue;
    }

    this.part.params = this.params;
    this.updateText();
  }

  updateText() {
    if (this.params.length === 0) {
      this.text = this.def.type + '()';
      return;
    }

    var text = this.def.type + '(';
    text += this.params.join(', ');
    text += ')';
    this.text = text;
  }
}

export default {
  create: function(part): any {
    return new QueryPart(part);
  },

  getCategories: function() {
    return categories;
  },
};
