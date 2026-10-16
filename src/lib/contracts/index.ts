// Registry of every API contract, one module per domain.
//
// Adding a domain: create its module, then add one entry to `domains`. Its
// OpenAPI file (api/openapi/<file>.yaml) is generated from that entry.

import { accountContracts } from './accounts';
import { assetContracts } from './assets';
import { auditContracts } from './audit';
import { authContracts } from './auth';
import type { ApiContract } from './common';
import { customerContracts } from './customers';
import { driverContracts } from './driver';
import { factoryContracts } from './factory';
import { inventoryContracts } from './inventory';
import { orderContracts } from './orders';
import { priceContracts } from './prices';
import { productContracts } from './products';
import { reportContracts } from './reports';
import { scheduleContracts } from './schedule';
import { shellDepositContracts } from './shell-deposits';
import { systemContracts } from './system';

export type { ApiContract, ContractAuth, HttpMethod, Role } from './common';
export { ErrorResponse, envelope, IDEMPOTENCY_HEADER } from './common';

export interface ContractDomain {
  /** File name (without extension) of the generated OpenAPI document */
  file: string;
  description: string;
  contracts: ApiContract[];
}

export const domains: ContractDomain[] = [
  { file: 'auth', description: 'Sign-in, session and password', contracts: authContracts },
  { file: 'account', description: 'Staff and driver accounts, managed by the manager', contracts: accountContracts },
  { file: 'factory', description: 'Factory profile and shift limits', contracts: factoryContracts },
  { file: 'customer', description: 'Customers and the debt export', contracts: customerContracts },
  { file: 'product', description: 'Product catalogue', contracts: productContracts },
  { file: 'price', description: 'Default and customer-specific prices', contracts: priceContracts },
  { file: 'inventory', description: 'Daily cold-storage stock', contracts: inventoryContracts },
  { file: 'shell_deposit', description: 'Shell (bag) deposits owed by customers', contracts: shellDepositContracts },
  { file: 'order', description: 'Orders: listing, status, assignment, delivery, reconciliation', contracts: orderContracts },
  { file: 'driver', description: "The signed-in driver's order list", contracts: driverContracts },
  { file: 'schedule', description: 'Shift scheduling: manager assignment, self-registration, approval', contracts: scheduleContracts },
  { file: 'report', description: 'Debt report, monthly shift report and payroll lock', contracts: reportContracts },
  { file: 'audit', description: 'Log of changes to orders and customer debt', contracts: auditContracts },
  { file: 'asset', description: 'Machines, vehicles and their maintenance', contracts: assetContracts },
  { file: 'system', description: 'Health check', contracts: systemContracts },
];

export const apiContracts: ApiContract[] = domains.flatMap((domain) => domain.contracts);

export function findContract(method: string, path: string): ApiContract | undefined {
  return apiContracts.find((contract) => contract.method === method && contract.path === path);
}
