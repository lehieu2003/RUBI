import { z } from 'zod';
import { type ApiContract, Id, Product, envelope, roles, session } from './common';

const ProductName = z.string().trim().min(1, 'Tên sản phẩm không được để trống').max(100);
const SizeKg = z.number().int('Cỡ bao phải là số nguyên').positive('Cỡ bao phải lớn hơn 0').max(1000);
const Unit = z.string().trim().min(1, 'Đơn vị không được để trống').max(20);

/** Body of POST /api/products; the route validates with this schema. */
export const CreateProductBody = z.object({
  name: ProductName,
  sizeKg: SizeKg,
  unit: Unit.optional(),
  price: z.number().positive('Giá bán phải lớn hơn 0').max(99_999_999),
});

/** Body of PATCH /api/products/{id}; the route validates with this schema. */
export const UpdateProductBody = z.object({
  name: ProductName.optional(),
  sizeKg: SizeKg.optional(),
  unit: Unit.optional(),
  isActive: z.boolean().optional(),
});

const productId = z.object({ id: Id });

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
  {
    id: 'createProduct',
    method: 'POST',
    path: '/api/products',
    tag: 'Products',
    summary: 'Add a product together with its default price',
    auth: roles('ADMIN'),
    body: CreateProductBody,
    successStatus: 201,
    response: envelope(Product),
    errors: [400, 401, 403, 409, 500],
    notes:
      'The price is required so that no product exists without one: an order cannot be taken for a product with no price. ' +
      '`unit` defaults to "Bao". 409 `PRODUCT_EXISTS` when a product with the same name and size already exists, ' +
      'even a discontinued one (reactivate it instead).',
  },
  {
    id: 'updateProduct',
    method: 'PATCH',
    path: '/api/products/{id}',
    tag: 'Products',
    summary: 'Rename a product, change its unit or size, or stop / resume selling it',
    auth: roles('ADMIN'),
    params: productId,
    body: UpdateProductBody,
    response: envelope(Product),
    errors: [400, 401, 403, 404, 409, 500],
    notes:
      'Only the fields sent are changed. Products are never deleted: `isActive: false` takes one off order entry while ' +
      'past orders keep it. 409 `PRODUCT_HAS_ORDERS` when changing `sizeKg` of a product that already has orders; ' +
      '409 `PRODUCT_EXISTS` when the new name and size collide with another product.',
  },
];
