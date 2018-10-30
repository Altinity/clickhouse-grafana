///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
import _ from 'lodash';

export default class ResponseParser {
    constructor(private $q) {
    }

    parse(query, results) {
        if (!results || results.data.length === 0) {
            return [];
        }

        var sqlResults = results.data;
        var res = [];
        _.each(sqlResults, r => {
            if (!_.isObject(r)) {
                res.push({text: r});
                return
            }
            let keys = Object.keys(r);
            if (keys.length > 1) {
                res.push(r);
            } else {
                res.push({text: r[keys[0]]});
            }
        });

        return res
    }

    transformAnnotationResponse(options, data) {
        const rows = data.data;
        const columns = data.meta;
        const result = [];
        let hasTime = false;

        for (let i = 0, len = columns.length; i < len; i++) {
            const column = columns[i];

            if (column.name === 'time') {
                hasTime = true;
                break;
            }
        }

        if (!hasTime) {
            return this.$q.reject({
                message: 'Missing mandatory time column in annotation query.',
            });
        }

        for (let i = 0, len = rows.length; i < len; i++) {
            const row = rows[i];

            result.push({
                annotation: options.annotation,
                time: Math.floor(row.time),
                title: row.title,
                text: row.text,
                tags: row.tags ? row.tags.trim().split(/\s*,\s*/) : []
            });
        }

        return result;
    }
}
