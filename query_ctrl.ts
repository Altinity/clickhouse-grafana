///<reference path="../../../headers/common.d.ts" />
import './query_part_editor';

import angular from 'angular';
import _ from 'lodash';
import SqlQueryBuilder from './query_builder';
import SqlQuery from './sql_query';
import queryPart from './query_part';
import {QueryCtrl} from 'app/plugins/sdk';
import appEvents from 'app/core/app_events';

class SqlQueryCtrl extends QueryCtrl {
    static templateUrl = 'partials/query.editor.html';

    queryModel: SqlQuery;
    queryBuilder: any;
    databaseSegment: any;
    dateColDataTypeSegment: any;
    dateTimeColDataTypeSegment: any;
    tagSegments: any[];
    selectMenu: any;
    tableSegment: any;
    removeTagFilterSegment: any;
    matchOperators: any;
    panel: any;
    datasource: any;
    target: any;

    /** @ngInject **/
    constructor($scope, $injector, private templateSrv, private $q, private uiSegmentSrv) {
        super($scope, $injector);

        this.matchOperators = {'match': 'REGEXP', 'not': 'NOT REGEXP'};

        this.queryModel = new SqlQuery(this.target, templateSrv, this.panel.scopedVars);
        this.queryBuilder = new SqlQueryBuilder(this.target);

        this.databaseSegment = uiSegmentSrv.newSegment(
            this.target.database || {fake: true, value: '-- database --'}
        );

        this.tableSegment = uiSegmentSrv.newSegment(
            this.target.table || {fake: true, value: '-- table --'}
        );

        this.dateColDataTypeSegment = uiSegmentSrv.newSegment(
            this.target.dateColDataType || {fake: true, value: '-- date : col --'}
        );

        this.dateTimeColDataTypeSegment = uiSegmentSrv.newSegment(
            this.target.dateTimeColDataType || {fake: true, value: '-- dateTime : col --'}
        );

        this.tagSegments = [];
        for (let tag of this.target.tags) {
            if (!tag.operator) {
                if (/^\/.*\/$/.test(tag.value)) {
                    tag.operator = this.matchOperators.match;
                } else {
                    tag.operator = '=';
                }
            }

            if (tag.condition) {
                this.tagSegments.push(uiSegmentSrv.newCondition(tag.condition));
            }

            this.tagSegments.push(uiSegmentSrv.newKey(tag.key));
            this.tagSegments.push(uiSegmentSrv.newOperator(tag.operator));
            this.tagSegments.push(uiSegmentSrv.newKeyValue(tag.value));
        }

        this.fixTagSegments();
        this.buildSelectMenu();
        this.removeTagFilterSegment = uiSegmentSrv.newSegment({
            fake: true, value: '-- remove tag filter --'
        });
    }

    buildSelectMenu() {
        var categories = queryPart.getCategories();
        this.selectMenu = _.reduce(categories, function (memo, cat, key) {
            var menu = {
                text: key,
                submenu: cat.map(item => {
                    return {text: item.type, value: item.type};
                }),
            };
            memo.push(menu);
            return memo;
        }, []);
    }

    addSelectPart(selectParts, cat, subitem) {
        this.queryModel.addSelectPart(selectParts, subitem.value);
        this.refreshQuery();
    }

    removeSelectPart(selectParts, part) {
        this.queryModel.removeSelectPart(selectParts, part);
        this.refreshQuery();
    }

    fixTagSegments() {
        var count = this.tagSegments.length;
        var lastSegment = this.tagSegments[Math.max(count - 1, 0)];

        if (!lastSegment || lastSegment.type !== 'plus-button') {
            this.tagSegments.push(this.uiSegmentSrv.newPlusButton());
        }
    }

    tableChanged() {
        this.target.table = this.tableSegment.value;
        this.refreshQuery();
    }

    querySegment(type: string) {
        var query = this.queryBuilder.buildExploreQuery(type);
        return this.datasource.metricFindQuery(query)
            .then(this.transformToSegments(false))
            .catch(this.handleQueryError.bind(this));
    }

    getDatabaseSegments() {
        return this.querySegment('DATABASES');
    }

    databaseChanged() {
        this.target.database = this.databaseSegment.value;
        this.refreshQuery();
    }

    getDateColDataTypeSegments() {
        return this.querySegment('DATE');
    }

    dateColDataTypeChanged() {
        this.target.dateColDataType = this.dateColDataTypeSegment.value;
        this.refreshQuery();
    }

    getDateTimeColDataTypeSegments() {
        return this.querySegment('DATE_TIME');
    }

    dateTimeColDataTypeChanged() {
        this.target.dateTimeColDataType = this.dateTimeColDataTypeSegment.value;
        this.refreshQuery();
    }

    toggleEditorMode() {
        var self = this;
        var modelQuery = this.queryModel.render(true);
        if (this.target.rawQuery && this.target.query !== modelQuery) {
            appEvents.emit('confirm-modal', {
                title: 'Query Alert',
                text: 'Query was changed manually. Toggling to Edit Mode would drop changes. Continue?',
                icon: 'fa-exclamation',
                yesText: 'Continue',
                onConfirm: function(){
                    self._toggleEditorMode();
                }
            });
            return false;
        }
        this._toggleEditorMode();
    }

    _toggleEditorMode() {
        this.target.rawQuery = !this.target.rawQuery;
        this.refreshQuery();
    }

    refreshQuery() {
        this.target.query = this.queryModel.render(false);
    }

    getTableSegments() {
        return this.querySegment('TABLES');
    }

    getPartOptions(part) {
        if (part.def.type === 'field') {
            return this.querySegment('TAG_KEYS');
        }
    }

    handleQueryError(err) {
        this.error = err.message || 'Failed to issue metric query';
        return [];
    }

    transformToSegments(addTemplateVars) {
        return (results) => {
            var segments = _.map(results, segment => {
                return this.uiSegmentSrv.newSegment({value: segment.text, expandable: segment.expandable});
            });

            if (addTemplateVars) {
                for (let variable of this.templateSrv.variables) {
                    segments.unshift(this.uiSegmentSrv.newSegment({
                        type: 'template', value: '/^$' + variable.name + '$/', expandable: true
                    }));
                    segments.unshift(this.uiSegmentSrv.newSegment({
                        type: 'template', value: '$' + variable.name, expandable: true
                    }));
                }
            }

            return segments;
        };
    }

    getTagsOrValues(segment, index) {
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
            } else {
                return this.$q.when(this.uiSegmentSrv.newOperators([
                    '=', '<>', '<', '>', 'in'
                ]));
            }
        }

        var query;
        if (segment.type === 'key' || segment.type === 'plus-button') {
            query = this.queryBuilder.buildExploreQuery('TAG_KEYS');
        } else if (segment.type === 'value') {
            return this.$q.when([
                this.uiSegmentSrv.newSegment(0)
            ]);
        }

        return this.datasource.metricFindQuery(query)
            .then(this.transformToSegments(false))
            .then(results => {
                if (segment.type === 'key') {
                    results.splice(0, 0, angular.copy(this.removeTagFilterSegment));
                }
                return results;
            })
            .catch(this.handleQueryError.bind(this));
    }

    tagSegmentUpdated(segment, index) {
        this.tagSegments[index] = segment;

        // handle remove tag condition
        if (segment.value === this.removeTagFilterSegment.value) {
            this.tagSegments.splice(index, 3);
            if (this.tagSegments.length === 0) {
                this.tagSegments.push(this.uiSegmentSrv.newPlusButton());
            } else if (this.tagSegments.length > 2) {
                this.tagSegments.splice(Math.max(index - 1, 0), 1);
                if (this.tagSegments[this.tagSegments.length - 1].type !== 'plus-button') {
                    this.tagSegments.push(this.uiSegmentSrv.newPlusButton());
                }
            }
        } else {
            if (segment.type === 'plus-button') {
                if (index > 2) {
                    this.tagSegments.splice(index, 0, this.uiSegmentSrv.newCondition('AND'));
                }
                this.tagSegments.push(this.uiSegmentSrv.newOperator('='));
                this.tagSegments.push(this.uiSegmentSrv.newFake(
                    'set value', 'value', 'query-segment-value'
                ));
                segment.type = 'key';
                segment.cssClass = 'query-segment-key';
            }

            if ((index + 1) === this.tagSegments.length) {
                this.tagSegments.push(this.uiSegmentSrv.newPlusButton());
            }
        }

        this.rebuildTargetTagConditions();
        this.refreshQuery();
    }

    rebuildTargetTagConditions() {
        var tags = [];
        var tagIndex = 0;
        var tagOperator = "";

        _.each(this.tagSegments, (segment2, index) => {
            if (segment2.type === 'key') {
                if (tags.length === 0) {
                    tags.push({});
                }
                tags[tagIndex].key = segment2.value;
            } else if (segment2.type === 'value') {
                tagOperator = this.getTagValueOperator(segment2.value, tags[tagIndex].operator);
                if (tagOperator) {
                    this.tagSegments[index - 1] = this.uiSegmentSrv.newOperator(tagOperator);
                    tags[tagIndex].operator = tagOperator;
                }
                tags[tagIndex].value = segment2.value;
            } else if (segment2.type === 'condition') {
                tags.push({condition: segment2.value});
                tagIndex += 1;
            } else if (segment2.type === 'operator') {
                tags[tagIndex].operator = segment2.value;
            }
        });

        this.target.tags = tags;
        this.refreshQuery();
    }

    getTagValueOperator(tagValue, tagOperator) {
        if (tagOperator !== this.matchOperators.match &&
            tagOperator !== this.matchOperators.not &&
            /^\/.*\/$/.test(tagValue)) {
            return this.matchOperators.match;

        } else if ((tagOperator === this.matchOperators.match ||
            tagOperator === this.matchOperators.not) &&
            /^(?!\/.*\/$)/.test(tagValue)) {
            return '=';
        }
    }

    getCollapsedText() {
        return this.queryModel.render(false);
    }
}

export {SqlQueryCtrl};
