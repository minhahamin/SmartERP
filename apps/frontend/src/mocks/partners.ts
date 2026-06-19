export type PartnerType = 'CUSTOMER' | 'VENDOR' | 'BOTH';
export type PartnerGrade = 'A' | 'B' | 'C';

export interface Partner {
  id: string;
  name: string;
  bizRegNo: string;
  type: PartnerType;
  ceoName: string;
  phone: string;
  email: string;
  address: string;
  grade: PartnerGrade;
  managerId: string;
  lastOrderDate: string;
}

export const PARTNERS: Partner[] = [
  { id: 'partner-1', name: '대한물산', bizRegNo: '123-45-67890', type: 'CUSTOMER', ceoName: '이대한', phone: '02-1234-5678', email: 'contact@daehan.co.kr', address: '서울특별시 영등포구 여의대로 12', grade: 'A', managerId: 'emp-1024', lastOrderDate: '2026-06-14' },
  { id: 'partner-2', name: '한빛전자', bizRegNo: '234-56-78901', type: 'VENDOR', ceoName: '박한빛', phone: '031-234-5678', email: 'sales@hanbit-e.co.kr', address: '경기도 화성시 산업단지로 45', grade: 'B', managerId: 'emp-1024', lastOrderDate: '2026-05-30' },
  { id: 'partner-3', name: '삼진산업', bizRegNo: '345-67-89012', type: 'CUSTOMER', ceoName: '김삼진', phone: '051-345-6789', email: 'info@samjin.co.kr', address: '부산광역시 강서구 녹산산단로 21', grade: 'A', managerId: 'emp-1101', lastOrderDate: '2026-06-10' },
  { id: 'partner-4', name: '베스트공업', bizRegNo: '456-78-90123', type: 'VENDOR', ceoName: '최베스트', phone: '032-456-7890', email: 'order@bestind.co.kr', address: '인천광역시 남동구 공단대로 88', grade: 'C', managerId: 'emp-1107', lastOrderDate: '2026-04-22' },
  { id: 'partner-5', name: '우진테크', bizRegNo: '567-89-01234', type: 'CUSTOMER', ceoName: '정우진', phone: '042-567-8901', email: 'biz@woojintech.co.kr', address: '대전광역시 유성구 대학로 99', grade: 'B', managerId: 'emp-1024', lastOrderDate: '2026-06-02' },
  { id: 'partner-6', name: '동양상사', bizRegNo: '678-90-12345', type: 'CUSTOMER', ceoName: '한동양', phone: '053-678-9012', email: 'sales@dongyang.co.kr', address: '대구광역시 달서구 성서산단로 7', grade: 'B', managerId: 'emp-1101', lastOrderDate: '2026-05-18' },
  { id: 'partner-7', name: '미래소재', bizRegNo: '789-01-23456', type: 'VENDOR', ceoName: '오미래', phone: '062-789-0123', email: 'contact@miraematerial.co.kr', address: '광주광역시 광산구 하남산단로 33', grade: 'A', managerId: 'emp-1107', lastOrderDate: '2026-06-08' },
  { id: 'partner-8', name: '정성유통', bizRegNo: '890-12-34567', type: 'CUSTOMER', ceoName: '윤정성', phone: '02-890-1234', email: 'info@jungsung.co.kr', address: '서울특별시 구로구 디지털로 30', grade: 'C', managerId: 'emp-1104', lastOrderDate: '2026-03-29' },
];

export function getPartnerById(id: string): Partner | undefined {
  return PARTNERS.find((p) => p.id === id);
}
