/** JWT Access Token payload (docs/12-jwt-auth-design.md 12.2) — req.user에 주입된다 */
export interface AuthUser {
  sub: string;
  companyId: string;
  roleId: string;
  roleName: string;
  departmentId: string | null;
  iat?: number;
  exp?: number;
}
