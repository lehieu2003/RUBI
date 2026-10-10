import { z } from 'zod';
import { type ApiContract, Product, envelope, session } from './common';

export const productContracts: ApiContract[] = [
  {
    id: 'listProducts',
    method: 'GET',
    path: '/api/products',
    tag: 'Products',
    summary: 'Active products, ordered by name then size',
    auth: session,
    response: envelope(z.array(Product)),
    errors: [400, 401, 500],
  },
];
