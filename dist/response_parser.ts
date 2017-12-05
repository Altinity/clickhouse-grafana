///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
import _ from 'lodash';

export default class ResponseParser {
  parse(query, results) {
    if (!results || results.data.length === 0) { return []; }

    var sqlResults = results.data;
    var res = [];
    _.each(sqlResults, r => {
        if (r && r.text && r.value) {
            res.push({ text: r.text, value: r.value });
            return
        }
        if (_.isObject(r)) {
            var key = Object.keys(r)[0];
            res.push({ text: r[key]});
            return
        }
        res.push({ text: r });
    });

    return res
  }
}
