import {
  CheckHealthRequest,
  CheckHealthResponse,
  DiagnosticsService,
  CollectMetricsRequest,
  CollectMetricsResponse
} from '@grafana/ts-backend';

export class TemplateDiagnosticsService extends DiagnosticsService {
  CheckHealth = async (request: CheckHealthRequest): Promise<CheckHealthResponse> => {
    const response: CheckHealthResponse = new CheckHealthResponse();
    response.setStatus(CheckHealthResponse.HealthStatus.OK)
    response.setMessage(`Connection successful.`);
    return Promise.resolve(response);
  }
  CollectMetrics = (request: CollectMetricsRequest): Promise<CollectMetricsResponse> => {
    throw new Error("Method not implemented.");
  }
}
