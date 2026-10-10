export type TenantRole = 'ADMIN' | 'STAFF' | 'DRIVER';

export type AppRoutePermission = {
  href: string;
  label: string;
  roles: TenantRole[];
  match?: 'exact' | 'prefix';
};

const allTenantRoles: TenantRole[] = ['ADMIN', 'STAFF'];
const opsRoles: TenantRole[] = ['ADMIN'];

export const tenantRoutePermissions: AppRoutePermission[] = [
  { href: '/dashboard', label: 'Tong quan', roles: allTenantRoles, match: 'exact' },
  { href: '/orders', label: 'Don hang', roles: allTenantRoles, match: 'prefix' },
  { href: '/customers', label: 'Khach hang', roles: allTenantRoles, match: 'prefix' },
  { href: '/driver', label: 'Tai xe', roles: ['DRIVER'], match: 'prefix' },
  { href: '/settle', label: 'Doi soat', roles: opsRoles, match: 'prefix' },
  { href: '/inventory', label: 'Kho lanh', roles: opsRoles, match: 'prefix' },
  { href: '/vehicles', label: 'Doi xe', roles: opsRoles, match: 'prefix' },
  { href: '/assets', label: 'Tai san', roles: opsRoles, match: 'prefix' },
  { href: '/schedule', label: 'Lich trinh', roles: opsRoles, match: 'prefix' },
  { href: '/reports/debt', label: 'Bao cao no', roles: opsRoles, match: 'prefix' },
  { href: '/deposits/shells', label: 'Vo bao', roles: opsRoles, match: 'prefix' },
  { href: '/settings', label: 'Cai dat', roles: opsRoles, match: 'prefix' },
  { href: '/config/prices', label: 'Bang gia', roles: ['ADMIN'], match: 'prefix' },
];

function isPathMatch(pathname: string, permission: AppRoutePermission): boolean {
  if (permission.match === 'prefix') {
    return pathname === permission.href || pathname.startsWith(`${permission.href}/`);
  }
  return pathname === permission.href;
}

export function getRoutePermission(pathname: string): AppRoutePermission | null {
  return tenantRoutePermissions
    .filter((permission) => isPathMatch(pathname, permission))
    .sort((a, b) => b.href.length - a.href.length)[0] ?? null;
}

export function getAllowedRolesForPath(pathname: string): TenantRole[] | null {
  return getRoutePermission(pathname)?.roles ?? null;
}

export function isTenantAppPath(pathname: string): boolean {
  return getRoutePermission(pathname) !== null;
}

export function canAccessPath(role: TenantRole | undefined, pathname: string): boolean {
  if (!role) return false;
  const allowedRoles = getAllowedRolesForPath(pathname);
  return allowedRoles ? allowedRoles.includes(role) : false;
}

export function getVisibleTenantRoutes(role: TenantRole | undefined): AppRoutePermission[] {
  if (!role) return [];
  return tenantRoutePermissions.filter((permission) => permission.roles.includes(role));
}
