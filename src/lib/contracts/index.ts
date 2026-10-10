// Registry of every API contract. One entry per exported route handler.

import { assetContracts } from './assets';
import { authContracts } from './auth';
import { catalogContracts } from './catalog';
import type { ApiContract } from './common';
import { orderContracts } from './orders';
import { peopleContracts } from './people';
import { scheduleContracts } from './schedule';

export type { ApiContract, ContractAuth, HttpMethod, Role } from './common';
export { ErrorResponse, envelope } from './common';

export const apiContracts: ApiContract[] = [
  ...authContracts,
  ...catalogContracts,
  ...orderContracts,
  ...peopleContracts,
  ...scheduleContracts,
  ...assetContracts,
];

export function findContract(method: string, path: string): ApiContract | undefined {
  return apiContracts.find((contract) => contract.method === method && contract.path === path);
}
