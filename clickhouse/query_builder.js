define([
  'lodash'
],
function (_) {
  'use strict';

  function SqlQueryBuilder(target) {
    this.target = target;
  }

  function renderTagCondition (tag, index) {
    var str = "";
    var operator = tag.operator;
    var value = tag.value;
    if (index > 0) {
      str = (tag.condition || 'AND') + ' ';
    }

    // quote value unless regex or number
    if (isNaN(+value)) {
      value = "'" + value + "'";
    }

    return str + '"' + tag.key + '" ' + operator + ' ' + value;
  }

  var p = SqlQueryBuilder.prototype;

  p.build = function() {
    return this.target.rawQuery ? this._modifyRawQuery() : this._buildQuery();
  };

  p.buildExploreQuery = function(type, withKey) {
    var query;
    var table;

    if (type === 'TAG_KEYS') {
      query = 'SELECT name ' +
              'FROM system.columns ' +
              'WHERE database = \'' + this.target.database + '\' AND ' +
              'table = \'' + this.target.table + '\' ' +
              'ORDER BY name';
      return query;

    } else if (type === 'TABLES') {
      query = 'SELECT name ' +
              'FROM system.tables ' +
              'WHERE database = \'' + this.target.database + '\' ' +
              'ORDER BY name';
      return query;

    } else if (type === 'FIELDS') {
      query = 'SELECT name ' +
              'FROM system.columns ' +
              'WHERE database = \'' + this.target.database + '\' AND ' +
                    'table = \'' + this.target.table + '\' ' +
              'ORDER BY name';
      return query;

    } else if (type === 'DATE') {
      query = 'SELECT name ' +
              'FROM system.columns ' +
              'WHERE database = \'' + this.target.database + '\' AND ' +
                    'table = \'' + this.target.table + '\' AND ' +
                    'type = \'Date\' ' +
              'ORDER BY name';
      return query;

    } else if (type === 'DATE_TIME') {
      query = 'SELECT name ' +
            'FROM system.columns ' +
            'WHERE database = \'' + this.target.database + '\' AND ' +
            'table = \'' + this.target.table + '\' AND ' +
            'type = \'DateTime\' ' +
            'ORDER BY name';
      return query;

    } else if (type === 'DATABASES') {
      query = 'SELECT name ' +
              'FROM system.databases ' +
              'ORDER BY name';
      return query;
    }

    if (table) {
      if (!table.match('^/.*/') && !table.match(/^merge\(.*\)/)) {
        table = '"' + table+ '"';
      }
      query += ' FROM ' + table;
    }

    if (this.target.tags && this.target.tags.length > 0) {
      var whereConditions = _.reduce(this.target.tags, function(memo, tag) {
        // do not add a condition for the key we want to explore for
        if (tag.key === withKey) {
          return memo;
        }
        memo.push(renderTagCondition(tag, memo.length));
        return memo;
      }, []);

      if (whereConditions.length > 0) {
        query +=  ' WHERE ' + whereConditions.join(' ');
      }
    }

    return query;
  };

  return SqlQueryBuilder;
});
