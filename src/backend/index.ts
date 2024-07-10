import { BackendServer } from '@grafana/ts-backend';
import { TemplateDiagnosticsService } from './DiagnosticsService';
import { TemplateDataService } from './DataService';
// import { TemplateResourceService } from './ResourceService';

export const app = new BackendServer();
app.addDiagnosticsService(new TemplateDiagnosticsService());
app.addDataService(new TemplateDataService());
// app.addResourceService(new TemplateResourceService() as any);

app.run();
