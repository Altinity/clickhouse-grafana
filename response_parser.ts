///<reference path="../../../headers/common.d.ts" />
import _ from 'lodash';

export default class ResponseParser {

  parse(query, results) {
    if (!results || results.data.length === 0) { return []; }

    var sqlResults = results.data;
    var res = [], v;
    _.each(sqlResults, row => {
        _.each(row, value => {
            if (_.isArray(value) || _.isOb) {
              v = value[0];
            } else {
              v = value;
            }

            if ( res.indexOf( v ) === -1 ) {
                res.push(v);
            }
        });
    });

    return _.map(res, value => {
      return { text: value};
    });
  }
}
