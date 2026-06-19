import type { RoleName } from '@/types/auth';

export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED';

export interface Employee {
  id: string;
  employeeNo: string;
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  role: RoleName;
  position: string;
  hireDate: string;
  status: EmployeeStatus;
}

export const EMPLOYEES: Employee[] = [
  { id: 'emp-1000', employeeNo: 'E-1000', name: '김도윤', email: 'doyoon.kim@erpilot.io', phone: '010-1000-2000', departmentId: 'dept-mgmt', role: 'ADMIN', position: '대표', hireDate: '2018-01-02', status: 'ACTIVE' },
  { id: 'emp-1024', employeeNo: 'E-1024', name: '김민준', email: 'minjun.kim@erpilot.io', phone: '010-1234-5678', departmentId: 'dept-sales1', role: 'SALES_MANAGER', position: '팀장', hireDate: '2021-03-15', status: 'ACTIVE' },
  { id: 'emp-1025', employeeNo: 'E-1025', name: '이서연', email: 'seoyeon.lee@erpilot.io', phone: '010-2345-6789', departmentId: 'dept-sales1', role: 'EMPLOYEE', position: '대리', hireDate: '2022-07-01', status: 'ACTIVE' },
  { id: 'emp-1031', employeeNo: 'E-1031', name: '박지훈', email: 'jihoon.park@erpilot.io', phone: '010-3456-7890', departmentId: 'dept-prod1', role: 'EMPLOYEE', position: '사원', hireDate: '2023-01-10', status: 'ACTIVE' },
  { id: 'emp-1042', employeeNo: 'E-1042', name: '최유진', email: 'yujin.choi@erpilot.io', phone: '010-4567-8901', departmentId: 'dept-hr', role: 'HR_MANAGER', position: '과장', hireDate: '2020-11-20', status: 'ACTIVE' },
  { id: 'emp-1077', employeeNo: 'E-1077', name: '정하늘', email: 'haneul.jung@erpilot.io', phone: '010-5678-9012', departmentId: 'dept-prod2', role: 'EMPLOYEE', position: '사원', hireDate: '2024-05-02', status: 'ON_LEAVE' },
  { id: 'emp-1090', employeeNo: 'E-1090', name: '강도윤', email: 'doyoon.kang@erpilot.io', phone: '010-6789-0123', departmentId: 'dept-sales2', role: 'EMPLOYEE', position: '사원', hireDate: '2019-09-09', status: 'RESIGNED' },
  { id: 'emp-1101', employeeNo: 'E-1101', name: '한지민', email: 'jimin.han@erpilot.io', phone: '010-7890-1234', departmentId: 'dept-sales2', role: 'EMPLOYEE', position: '대리', hireDate: '2021-05-01', status: 'ACTIVE' },
  { id: 'emp-1102', employeeNo: 'E-1102', name: '오세훈', email: 'sehoon.oh@erpilot.io', phone: '010-8901-2345', departmentId: 'dept-prod1', role: 'EMPLOYEE', position: '사원', hireDate: '2022-02-14', status: 'ACTIVE' },
  { id: 'emp-1103', employeeNo: 'E-1103', name: '윤서아', email: 'seoa.yoon@erpilot.io', phone: '010-9012-3456', departmentId: 'dept-hr', role: 'EMPLOYEE', position: '사원', hireDate: '2023-08-21', status: 'ACTIVE' },
  { id: 'emp-1104', employeeNo: 'E-1104', name: '임도현', email: 'dohyun.lim@erpilot.io', phone: '010-0123-4567', departmentId: 'dept-sales1', role: 'EMPLOYEE', position: '사원', hireDate: '2023-11-06', status: 'ACTIVE' },
  { id: 'emp-1105', employeeNo: 'E-1105', name: '신유빈', email: 'yubin.shin@erpilot.io', phone: '010-1122-3344', departmentId: 'dept-prod2', role: 'EMPLOYEE', position: '사원', hireDate: '2024-02-19', status: 'ACTIVE' },
  { id: 'emp-1106', employeeNo: 'E-1106', name: '조은우', email: 'eunwoo.jo@erpilot.io', phone: '010-2233-4455', departmentId: 'dept-mgmt', role: 'EMPLOYEE', position: '사원', hireDate: '2022-09-12', status: 'ACTIVE' },
  { id: 'emp-1107', employeeNo: 'E-1107', name: '배수민', email: 'sumin.bae@erpilot.io', phone: '010-3344-5566', departmentId: 'dept-sales1', role: 'EMPLOYEE', position: '사원', hireDate: '2024-04-03', status: 'ACTIVE' },
  { id: 'emp-1108', employeeNo: 'E-1108', name: '노아인', email: 'aein.no@erpilot.io', phone: '010-4455-6677', departmentId: 'dept-prod1', role: 'EMPLOYEE', position: '사원', hireDate: '2024-06-10', status: 'ACTIVE' },
];

export function getEmployeeById(id: string): Employee | undefined {
  return EMPLOYEES.find((e) => e.id === id);
}
