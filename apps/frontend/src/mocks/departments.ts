export interface Department {
  id: string;
  name: string;
  parentId: string | null;
  managerId: string | null;
}

export const DEPARTMENTS: Department[] = [
  { id: 'dept-mgmt', name: '경영지원팀', parentId: null, managerId: 'emp-1000' },
  { id: 'dept-hr', name: '인사팀', parentId: null, managerId: 'emp-1042' },
  { id: 'dept-sales-hq', name: '영업본부', parentId: null, managerId: null },
  { id: 'dept-sales1', name: '영업1팀', parentId: 'dept-sales-hq', managerId: 'emp-1024' },
  { id: 'dept-sales2', name: '영업2팀', parentId: 'dept-sales-hq', managerId: null },
  { id: 'dept-prod-hq', name: '생산본부', parentId: null, managerId: null },
  { id: 'dept-prod1', name: '생산1팀', parentId: 'dept-prod-hq', managerId: null },
  { id: 'dept-prod2', name: '생산2팀', parentId: 'dept-prod-hq', managerId: null },
];
