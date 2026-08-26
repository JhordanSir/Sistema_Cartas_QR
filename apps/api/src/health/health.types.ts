export interface LivenessResponse {
  service: 'api';
  status: 'ok';
  timestamp: string;
}

export interface ReadinessResponse extends LivenessResponse {
  database: 'up';
}
