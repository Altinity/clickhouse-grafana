System.register(["./query_part_editor", "angular", "lodash", "./query_builder", "./sql_query", "./query_part", "app/plugins/sdk", "app/core/app_events"], function (exports_1, context_1) {
    "use strict";
    var __extends = (this && this.__extends) || function (d, b) {
        for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
    var __moduleName = context_1 && context_1.id;
    var angular_1, lodash_1, query_builder_1, sql_query_1, query_part_1, sdk_1, app_events_1, SqlQueryCtrl;
    return {
        setters: [
            function (_1) {
            },
            function (angular_1_1) {
                angular_1 = angular_1_1;
            },
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (query_builder_1_1) {
                query_builder_1 = query_builder_1_1;
            },
            function (sql_query_1_1) {
                sql_query_1 = sql_query_1_1;
            },
            function (query_part_1_1) {
                query_part_1 = query_part_1_1;
            },
            function (sdk_1_1) {
                sdk_1 = sdk_1_1;
            },
            function (app_events_1_1) {
                app_events_1 = app_events_1_1;
            }
        ],
        execute: function () {
            SqlQueryCtrl = (function (_super) {
                __extends(SqlQueryCtrl, _super);
                /** @ngInject **/
                function SqlQueryCtrl($scope, $injector, templateSrv, $q, uiSegmentSrv) {
                    var _this = _super.call(this, $scope, $injector) || this;
                    _this.templateSrv = templateSrv;
                    _this.$q = $q;
                    _this.uiSegmentSrv = uiSegmentSrv;
                    _this.matchOperators = { 'match': 'REGEXP', 'not': 'NOT REGEXP' };
                    _this.queryModel = new sql_query_1.default(_this.target, templateSrv, _this.panel.scopedVars);
                    _this.queryBuilder = new query_builder_1.default(_this.target);
                    _this.databaseSegment = uiSegmentSrv.newSegment(_this.target.database || { fake: true, value: '-- database --' });
                    _this.tableSegment = uiSegmentSrv.newSegment(_this.target.table || { fake: true, value: '-- table --' });
                    _this.dateColDataTypeSegment = uiSegmentSrv.newSegment(_this.target.dateColDataType || { fake: true, value: '-- date : col --' });
                    _this.dateTimeColDataTypeSegment = uiSegmentSrv.newSegment(_this.target.dateTimeColDataType || { fake: true, value: '-- dateTime : col --' });
                    _this.tagSegments = [];
                    for (var _i = 0, _a = _this.target.tags; _i < _a.length; _i++) {
                        var tag = _a[_i];
                        if (!tag.operator) {
                            if (/^\/.*\/$/.test(tag.value)) {
                                tag.operator = _this.matchOperators.match;
                            }
                            else {
                                tag.operator = '=';
                            }
                        }
                        if (tag.condition) {
                            _this.tagSegments.push(uiSegmentSrv.newCondition(tag.condition));
                        }
                        _this.tagSegments.push(uiSegmentSrv.newKey(tag.key));
                        _this.tagSegments.push(uiSegmentSrv.newOperator(tag.operator));
                        _this.tagSegments.push(uiSegmentSrv.newKeyValue(tag.value));
                    }
                    _this.fixTagSegments();
                    _this.buildSelectMenu();
                    _this.removeTagFilterSegment = uiSegmentSrv.newSegment({
                        fake: true, value: '-- remove tag filter --'
                    });
                    return _this;
                }
                SqlQueryCtrl.prototype.buildSelectMenu = function () {
                    var categories = query_part_1.default.getCategories();
                    this.selectMenu = lodash_1.default.reduce(categories, function (memo, cat, key) {
                        var menu = {
                            text: key,
                            submenu: cat.map(function (item) {
                                return { text: item.type, value: item.type };
                            }),
                        };
                        memo.push(menu);
                        return memo;
                    }, []);
                };
                SqlQueryCtrl.prototype.addSelectPart = function (selectParts, cat, subitem) {
                    this.queryModel.addSelectPart(selectParts, subitem.value);
                    this.refreshQuery();
                };
                SqlQueryCtrl.prototype.removeSelectPart = function (selectParts, part) {
                    this.queryModel.removeSelectPart(selectParts, part);
                    this.refreshQuery();
                };
                SqlQueryCtrl.prototype.fixTagSegments = function () {
                    var count = this.tagSegments.length;
                    var lastSegment = this.tagSegments[Math.max(count - 1, 0)];
                    if (!lastSegment || lastSegment.type !== 'plus-button') {
                        this.tagSegments.push(this.uiSegmentSrv.newPlusButton());
                    }
                };
                SqlQueryCtrl.prototype.tableChanged = function () {
                    this.target.table = this.tableSegment.value;
                    this.refreshQuery();
                };
                SqlQueryCtrl.prototype.querySegment = function (type) {
                    var query = this.queryBuilder.buildExploreQuery(type);
                    return this.datasource.metricFindQuery(query)
                        .then(this.transformToSegments(false))
                        .catch(this.handleQueryError.bind(this));
                };
                SqlQueryCtrl.prototype.getDatabaseSegments = function () {
                    return this.querySegment('DATABASES');
                };
                SqlQueryCtrl.prototype.databaseChanged = function () {
                    this.target.database = this.databaseSegment.value;
                    this.refreshQuery();
                };
                SqlQueryCtrl.prototype.getDateColDataTypeSegments = function () {
                    return this.querySegment('DATE');
                };
                SqlQueryCtrl.prototype.dateColDataTypeChanged = function () {
                    this.target.dateColDataType = this.dateColDataTypeSegment.value;
                    this.refreshQuery();
                };
                SqlQueryCtrl.prototype.getDateTimeColDataTypeSegments = function () {
                    return this.querySegment('DATE_TIME');
                };
                SqlQueryCtrl.prototype.dateTimeColDataTypeChanged = function () {
                    this.target.dateTimeColDataType = this.dateTimeColDataTypeSegment.value;
                    this.refreshQuery();
                };
                SqlQueryCtrl.prototype.toggleEditorMode = function () {
                    var self = this;
                    var modelQuery = this.queryModel.render(true);
                    if (this.target.rawQuery && this.target.query !== modelQuery) {
                        app_events_1.default.emit('confirm-modal', {
                            title: 'Query Alert',
                            text: 'Query was changed manually. Toggling to Edit Mode would drop changes. Continue?',
                            icon: 'fa-exclamation',
                            yesText: 'Continue',
                            onConfirm: function () {
                                self._toggleEditorMode();
                            }
                        });
                        return false;
                    }
                    this._toggleEditorMode();
                };
                SqlQueryCtrl.prototype._toggleEditorMode = function () {
                    this.target.rawQuery = !this.target.rawQuery;
                    this.refreshQuery();
                };
                SqlQueryCtrl.prototype.refreshQuery = function () {
                    this.target.query = this.queryModel.render(false);
                };
                SqlQueryCtrl.prototype.getTableSegments = function () {
                    return this.querySegment('TABLES');
                };
                SqlQueryCtrl.prototype.getPartOptions = function (part) {
                    if (part.def.type === 'field') {
                        return this.querySegment('TAG_KEYS');
                    }
                };
                SqlQueryCtrl.prototype.handleQueryError = function (err) {
                    this.error = err.message || 'Failed to issue metric query';
                    return [];
                };
                SqlQueryCtrl.prototype.transformToSegments = function (addTemplateVars) {
                    var _this = this;
                    return function (results) {
                        var segments = lodash_1.default.map(results, function (segment) {
                            return _this.uiSegmentSrv.newSegment({ value: segment.text, expandable: segment.expandable });
                        });
                        if (addTemplateVars) {
                            for (var _i = 0, _a = _this.templateSrv.variables; _i < _a.length; _i++) {
                                var variable = _a[_i];
                                segments.unshift(_this.uiSegmentSrv.newSegment({
                                    type: 'template', value: '/^$' + variable.name + '$/', expandable: true
                                }));
                                segments.unshift(_this.uiSegmentSrv.newSegment({
                                    type: 'template', value: '$' + variable.name, expandable: true
                                }));
                            }
                        }
                        return segments;
                    };
                };
                SqlQueryCtrl.prototype.getTagsOrValues = function (segment, index) {
                    var _this = this;
                    if (segment.type === 'condition') {
                        return this.$q.when([
                            this.uiSegmentSrv.newSegment('AND'), this.uiSegmentSrv.newSegment('OR')
                        ]);
                    }
                    if (segment.type === 'operator') {
                        var nextValue = this.tagSegments[index + 1].value;
                        if (/^\/.*\/$/.test(nextValue)) {
                            return this.$q.when(this.uiSegmentSrv.newOperators([
                                this.matchOperators.match, this.matchOperators.not
                            ]));
                        }
                        else {
                            return this.$q.when(this.uiSegmentSrv.newOperators([
                                '=', '<>', '<', '>', 'in'
                            ]));
                        }
                    }
                    var query;
                    if (segment.type === 'key' || segment.type === 'plus-button') {
                        query = this.queryBuilder.buildExploreQuery('TAG_KEYS');
                    }
                    else if (segment.type === 'value') {
                        return this.$q.when([
                            this.uiSegmentSrv.newSegment(0)
                        ]);
                    }
                    return this.datasource.metricFindQuery(query)
                        .then(this.transformToSegments(false))
                        .then(function (results) {
                        if (segment.type === 'key') {
                            results.splice(0, 0, angular_1.default.copy(_this.removeTagFilterSegment));
                        }
                        return results;
                    })
                        .catch(this.handleQueryError.bind(this));
                };
                SqlQueryCtrl.prototype.tagSegmentUpdated = function (segment, index) {
                    this.tagSegments[index] = segment;
                    // handle remove tag condition
                    if (segment.value === this.removeTagFilterSegment.value) {
                        this.tagSegments.splice(index, 3);
                        if (this.tagSegments.length === 0) {
                            this.tagSegments.push(this.uiSegmentSrv.newPlusButton());
                        }
                        else if (this.tagSegments.length > 2) {
                            this.tagSegments.splice(Math.max(index - 1, 0), 1);
                            if (this.tagSegments[this.tagSegments.length - 1].type !== 'plus-button') {
                                this.tagSegments.push(this.uiSegmentSrv.newPlusButton());
                            }
                        }
                    }
                    else {
                        if (segment.type === 'plus-button') {
                            if (index > 2) {
                                this.tagSegments.splice(index, 0, this.uiSegmentSrv.newCondition('AND'));
                            }
                            this.tagSegments.push(this.uiSegmentSrv.newOperator('='));
                            this.tagSegments.push(this.uiSegmentSrv.newFake('set value', 'value', 'query-segment-value'));
                            segment.type = 'key';
                            segment.cssClass = 'query-segment-key';
                        }
                        if ((index + 1) === this.tagSegments.length) {
                            this.tagSegments.push(this.uiSegmentSrv.newPlusButton());
                        }
                    }
                    this.rebuildTargetTagConditions();
                    this.refreshQuery();
                };
                SqlQueryCtrl.prototype.rebuildTargetTagConditions = function () {
                    var _this = this;
                    var tags = [];
                    var tagIndex = 0;
                    var tagOperator = "";
                    lodash_1.default.each(this.tagSegments, function (segment2, index) {
                        if (segment2.type === 'key') {
                            if (tags.length === 0) {
                                tags.push({});
                            }
                            tags[tagIndex].key = segment2.value;
                        }
                        else if (segment2.type === 'value') {
                            tagOperator = _this.getTagValueOperator(segment2.value, tags[tagIndex].operator);
                            if (tagOperator) {
                                _this.tagSegments[index - 1] = _this.uiSegmentSrv.newOperator(tagOperator);
                                tags[tagIndex].operator = tagOperator;
                            }
                            tags[tagIndex].value = segment2.value;
                        }
                        else if (segment2.type === 'condition') {
                            tags.push({ condition: segment2.value });
                            tagIndex += 1;
                        }
                        else if (segment2.type === 'operator') {
                            tags[tagIndex].operator = segment2.value;
                        }
                    });
                    this.target.tags = tags;
                    this.refreshQuery();
                };
                SqlQueryCtrl.prototype.getTagValueOperator = function (tagValue, tagOperator) {
                    if (tagOperator !== this.matchOperators.match &&
                        tagOperator !== this.matchOperators.not &&
                        /^\/.*\/$/.test(tagValue)) {
                        return this.matchOperators.match;
                    }
                    else if ((tagOperator === this.matchOperators.match ||
                        tagOperator === this.matchOperators.not) &&
                        /^(?!\/.*\/$)/.test(tagValue)) {
                        return '=';
                    }
                };
                SqlQueryCtrl.prototype.getCollapsedText = function () {
                    return this.queryModel.render(false);
                };
                return SqlQueryCtrl;
            }(sdk_1.QueryCtrl));
            SqlQueryCtrl.templateUrl = 'partials/query.editor.html';
            exports_1("SqlQueryCtrl", SqlQueryCtrl);
        }
    };
});
//# sourceMappingURL=query_ctrl.js.map