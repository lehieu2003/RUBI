import type { Product } from '@prisma/client';

/**
 * Products on sale grouped by name, in catalogue order: one group per kind of
 * ice, holding its bag sizes. Built from the catalogue itself, so a product the
 * manager adds shows up at once wherever products are listed by kind.
 */
export function groupProductsByName<T extends Pick<Product, 'name' | 'isActive'>>(products: T[]) {
  const active = products.filter((p) => p.isActive);
  const names = [...new Set(active.map((p) => p.name))];
  return names.map((name) => ({ name, products: active.filter((p) => p.name === name) }));
}
