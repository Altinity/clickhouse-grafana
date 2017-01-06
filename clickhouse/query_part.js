///<reference path="app/headers/common.d.ts" />
System.register(['lodash'], function(exports_1) {
    var lodash_1;
    var index, categories, QueryPartDef, QueryPart;
    function functionRenderer(part, innerExpr) {
        var str = part.def.type + '(';
        var parameters = lodash_1.default.map(part.params, function (value, index) {
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
        var parts = lodash_1.default.map(selectParts, function (part) {
            return new QueryPart({ type: part.def.type, params: lodash_1.default.clone(part.params) });
        });
        query.selectModels.push(parts);
    }
    return {
        setters:[
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            }],
        execute: function() {
            index = [];
            categories = {
                Aggregations: [],
                Selectors: [],
                Fields: [],
            };
            QueryPartDef = (function () {
                function QueryPartDef(options) {
                    this.type = options.type;
                    this.params = options.params;
                    this.defaultParams = options.defaultParams;
                    this.renderer = options.renderer;
                    this.category = options.category;
                    this.addStrategy = options.addStrategy;
                }
                QueryPartDef.register = function (options) {
                    index[options.type] = new QueryPartDef(options);
                    options.category.push(index[options.type]);
                };
                return QueryPartDef;
            })();
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
                params: [{ type: 'field', dynamicLookup: true }],
                defaultParams: ['value'],
                renderer: fieldRenderer,
            });
            QueryPartDef.register({
                type: 'tag',
                category: [],
                params: [{ name: 'tag', type: 'string', dynamicLookup: true }],
                defaultParams: ['tag'],
                renderer: fieldRenderer,
            });
            QueryPart = (function () {
                function QueryPart(part) {
                    this.part = part;
                    this.def = index[part.type];
                    if (!this.def) {
                        throw { message: 'Could not find query part ' + part.type };
                    }
                    part.params = part.params || lodash_1.default.clone(this.def.defaultParams);
                    this.params = part.params;
                    this.updateText();
                }
                QueryPart.prototype.render = function (innerExpr) {
                    return this.def.renderer(this, innerExpr);
                };
                QueryPart.prototype.hasMultipleParamsInString = function (strValue, index) {
                    if (strValue.indexOf(',') === -1) {
                        return false;
                    }
                    return this.def.params[index + 1] && this.def.params[index + 1].optional;
                };
                QueryPart.prototype.updateParam = function (strValue, index) {
                    // handle optional parameters
                    // if string contains ',' and next param is optional, split and update both
                    if (this.hasMultipleParamsInString(strValue, index)) {
                        lodash_1.default.each(strValue.split(','), function (partVal, idx) {
                            this.updateParam(partVal.trim(), idx);
                        }, this);
                        return;
                    }
                    if (strValue === '' && this.def.params[index].optional) {
                        this.params.splice(index, 1);
                    }
                    else {
                        this.params[index] = strValue;
                    }
                    this.part.params = this.params;
                    this.updateText();
                };
                QueryPart.prototype.updateText = function () {
                    if (this.params.length === 0) {
                        this.text = this.def.type + '()';
                        return;
                    }
                    var text = this.def.type + '(';
                    text += this.params.join(', ');
                    text += ')';
                    this.text = text;
                };
                return QueryPart;
            })();
            exports_1("default",{
                create: function (part) {
                    return new QueryPart(part);
                },
                getCategories: function () {
                    return categories;
                },
            });
        }
    }
});
//# sourceMappingURL=query_part.js.map