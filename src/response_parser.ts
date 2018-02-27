///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
import _ from 'lodash';

export default class ResponseParser {
  parse(query, results) {
    if (!results || results.data.length === 0) { return []; }

    var sqlResults = results.data;
    var res = [];
    _.each(sqlResults, r => {
        if (!_.isObject(r)) {
            res.push({ text: r });
            return
        }
        let keys = Object.keys(r);
        if (keys.length > 1) {
            res.push(r);
        } else {
            res.push({ text: r[keys[0]]});
        }
    });

    return res
  }
}
