import { PERMISSION_MATRIX_SEED, type PermissionAction, type PermissionMatrix } from '@/mocks/permissions';
import type { RoleName } from '@/types/auth';
import { delay } from '@/mocks/delay';

let matrixDb: PermissionMatrix = structuredClone(PERMISSION_MATRIX_SEED);

export async function getPermissionMatrix(): Promise<PermissionMatrix> {
  await delay(250);
  return matrixDb;
}

export async function togglePermission(role: RoleName, moduleKey: string, action: PermissionAction): Promise<PermissionMatrix> {
  await delay(200);
  const current = matrixDb[role][moduleKey] ?? [];
  const next = current.includes(action) ? current.filter((a) => a !== action) : [...current, action];
  matrixDb = { ...matrixDb, [role]: { ...matrixDb[role], [moduleKey]: next } };
  return matrixDb;
}
