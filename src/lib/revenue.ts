/** What a set of orders brought in: their totals, leaving cancelled orders out. */
export function revenueOf(orders: { total: number | string | { toString(): string }; status: string }[]): number {
  return orders.reduce((sum, order) => (order.status === 'CANCELLED' ? sum : sum + Number(order.total)), 0);
}
