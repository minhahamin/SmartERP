export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export const WAREHOUSES_SEED: Warehouse[] = [
  { id: 'wh-1', name: '1창고', location: '경기도 안산시' },
  { id: 'wh-2', name: '2창고', location: '충청남도 아산시' },
];
