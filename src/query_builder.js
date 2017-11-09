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

    switch (type){
        case 'TABLES':
            query = 'SELECT name ' +
                'FROM system.tables ' +
                'WHERE database = \'' + this.target.database + '\' ' +
                'ORDER BY name';
            break;
        case 'DATE':
            query = 'SELECT name ' +
                'FROM system.columns ' +
                'WHERE database = \'' + this.target.database + '\' AND ' +
                'table = \'' + this.target.table + '\' AND ' +
                'type = \'Date\' ' +
                'ORDER BY name';
            break;
        case 'DATETIME':
            query = 'SELECT name ' +
                'FROM system.columns ' +
                'WHERE database = \'' + this.target.database + '\' AND ' +
                'table = \'' + this.target.table + '\' AND ' +
                'type = \'DateTime\' ' +
                'ORDER BY name';
            break;
        case 'TIMESTAMP':
            query = 'SELECT name ' +
                'FROM system.columns ' +
                'WHERE database = \'' + this.target.database + '\' AND ' +
                'table = \'' + this.target.table + '\' AND ' +
                'type = \'UInt32\' ' +
                'ORDER BY name';
            break;
        case 'DATABASES':
            query = 'SELECT name ' +
                'FROM system.databases ' +
                'ORDER BY name';
            break;
    }

    return query;
  };

  return SqlQueryBuilder;
});
