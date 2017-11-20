import {ClickHouseDatasource} from './datasource';
import {SqlQueryCtrl} from './query_ctrl';

class SqlConfigCtrl {
  static templateUrl = 'partials/config.html';
}

export {
  ClickHouseDatasource as Datasource,
  SqlQueryCtrl as QueryCtrl,
  SqlConfigCtrl as ConfigCtrl,
};
