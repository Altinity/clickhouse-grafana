import { BackendServer } from '@grafana/ts-backend';
import { TemplateDataService } from './DataService';

export const app = new BackendServer();
app.addDataService(new TemplateDataService());

app.run();
