export type QueryValue = string | number | boolean | null | undefined;

export interface RestEndpoint {
  path: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: Record<string, QueryValue>;
  body?: unknown;
}

export interface GasEndpoint {
  action: string;
  params?: unknown;
}

/** Одна операция API в двух видах: REST для apps/server и действие для apps/gas */
export interface ApiEndpoint {
  rest: RestEndpoint;
  gas: GasEndpoint;
}

/** Способ доставить запрос до бэкенда. Код выше не знает, какой из них выбран */
export interface ApiTransport {
  request<T>(endpoint: ApiEndpoint, signal?: AbortSignal): Promise<T>;
}
