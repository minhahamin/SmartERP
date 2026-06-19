import { PARTNERS, type Partner, type PartnerGrade, type PartnerType } from '@/mocks/partners';
import { delay } from '@/mocks/delay';

let partnerDb: Partner[] = [...PARTNERS];

export interface PartnerListQuery {
  search?: string;
  type?: PartnerType;
}

export interface PartnerInput {
  name: string;
  bizRegNo: string;
  type: PartnerType;
  ceoName: string;
  phone: string;
  email: string;
  address: string;
  grade: PartnerGrade;
  managerId: string;
}

export async function listPartners(query: PartnerListQuery): Promise<Partner[]> {
  await delay();
  let items = [...partnerDb];
  if (query.search) {
    const keyword = query.search.trim().toLowerCase();
    items = items.filter((p) => p.name.toLowerCase().includes(keyword));
  }
  if (query.type) {
    items = items.filter((p) => p.type === query.type);
  }
  return items;
}

export async function createPartner(input: PartnerInput): Promise<Partner> {
  await delay(400);
  const partner: Partner = { id: `partner-${Date.now()}`, lastOrderDate: '-', ...input };
  partnerDb = [partner, ...partnerDb];
  return partner;
}

export async function updatePartner(id: string, input: PartnerInput): Promise<Partner> {
  await delay(400);
  partnerDb = partnerDb.map((p) => (p.id === id ? { ...p, ...input } : p));
  const updated = partnerDb.find((p) => p.id === id);
  if (!updated) throw new Error('거래처를 찾을 수 없습니다.');
  return updated;
}
