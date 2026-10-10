import { z } from 'zod';
import { type ApiContract, envelope, roles } from './common';

const FactoryProfile = z.object({
  name: z.string(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  maxStaffPerShift: z.number().int().nullable(),
  maxDriversPerShift: z.number().int().nullable(),
});

export const factoryContracts: ApiContract[] = [
  {
    id: 'getFactory',
    method: 'GET',
    path: '/api/factory',
    tag: 'Factory',
    summary: 'Factory profile and shift self-registration limits',
    auth: roles('ADMIN'),
    response: envelope(z.object({ factory: FactoryProfile })),
    errors: [400, 401, 403, 404, 500],
  },
  {
    id: 'updateFactory',
    method: 'PATCH',
    path: '/api/factory',
    tag: 'Factory',
    summary: 'Update the factory profile',
    auth: roles('ADMIN'),
    body: z.object({
      name: z.string().min(2).max(100),
      phone: z.string().max(20),
      address: z.string().max(200),
      maxStaffPerShift: z.number().int().min(1).max(100).nullable().optional(),
      maxDriversPerShift: z.number().int().min(1).max(100).nullable().optional(),
    }),
    response: envelope(z.object({ factory: FactoryProfile })),
    errors: [400, 401, 403, 500],
    notes: 'An empty `phone` or `address` is stored as null. A limit left out is unchanged; `null` removes it.',
  },
];
