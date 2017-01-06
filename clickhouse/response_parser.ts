///<reference path="app/headers/common.d.ts" />

import _ from 'lodash';

export default class ResponseParser {

  parse(query, results) {
    if (!results || results.data.length === 0) { return []; }

    var sqlResults = results.data;
    var res = {};
    _.each(sqlResults, row => {
        _.each(row, value => {
            if (_.isArray(value) || _.isOb) {
              addUnique(res, value[0]);
            } else {
              addUnique(res, value);
            }
        });
    });

    return _.map(res, value => {
      return { text: value};
    });
  }
}

function addUnique(arr, value) {
  arr[value] = value;
}
