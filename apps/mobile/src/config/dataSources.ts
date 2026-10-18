// Where the Today screen's readings come from. The engine, the black box and the handoff are the
// same for every source; only this choice changes.
export type DataSourceKey = 'simulated' | 'importExample';

export const DATA_SOURCE_OPTIONS: readonly {
  key: DataSourceKey;
  label: string;
}[] = [
  { key: 'simulated', label: 'Simulated' },
  { key: 'importExample', label: 'Import CSV' },
];
