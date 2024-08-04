import { BackendServer } from '@grafana/ts-backend';
import { ClickhouseDataService } from './DataService';

export const app = new BackendServer();
app.addDataService(new ClickhouseDataService());

app.run();
