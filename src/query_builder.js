define([
],
function () {
  'use strict';

  function SqlQueryBuilder(target) {
    this.target = target;
  }

  var p = SqlQueryBuilder.prototype;

  p.build = function() {
    return this.target.rawQuery ? this._modifyRawQuery() : this._buildQuery();
  };

  p.buildExploreQuery = function(type) {
    var query;

    if (type === 'TABLES') {
      query = 'SELECT name ' +
              'FROM system.tables ' +
              'WHERE database = \'' + this.target.database + '\' ' +
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

    return query;
  };

  return SqlQueryBuilder;
});
