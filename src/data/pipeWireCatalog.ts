export const PIPE_CATALOG = [
  { key: 'pipe-23', category: '管路規格', name: '2/3 管路', unitPrice: 450, unitLabel: '米' },
  { key: 'pipe-24', category: '管路規格', name: '2/4 管路', unitPrice: 500, unitLabel: '米' },
  { key: 'pipe-25', category: '管路規格', name: '2/5 管路', unitPrice: 550, unitLabel: '米' },
  { key: 'pipe-35', category: '管路規格', name: '3/5 管路', unitPrice: 600, unitLabel: '米' },
] as const;

export const SIGNAL_CABLE_CATALOG = [
  { key: 'sig-2c', category: '訊號線', name: '2C隔離線', unitPrice: 105, unitLabel: '米' },
  { key: 'sig-4c', category: '訊號線', name: '1.25*4C訊號線', unitPrice: 55, unitLabel: '米' },
] as const;

export const POWER_CABLE_CATALOG = [
  { key: 'pwr-20', category: '電源線', name: '2.0mm電源線', unitPrice: 125, unitLabel: '米' },
  { key: 'pwr-35', category: '電源線', name: '3.5mm電源線', unitPrice: 150, unitLabel: '米' },
  { key: 'pwr-55', category: '電源線', name: '5.5mm電源線', unitPrice: 200, unitLabel: '米' },
] as const;

export const WIRE_CATALOG = [...SIGNAL_CABLE_CATALOG, ...POWER_CABLE_CATALOG] as const;
export const PIPE_WIRE_CATALOG = [...PIPE_CATALOG, ...WIRE_CATALOG] as const;

export type PipeGauge = (typeof PIPE_CATALOG)[number]['name'];
export type WireType = (typeof WIRE_CATALOG)[number]['name'];
export type SignalCableType = (typeof SIGNAL_CABLE_CATALOG)[number]['name'];
export type PowerCableType = (typeof POWER_CABLE_CATALOG)[number]['name'];
export type PipeWireSpec = (typeof PIPE_WIRE_CATALOG)[number];
