import { z } from 'zod';
import { type ApiContract, Id, IsoDateTime, Success, envelope, roles } from './common';

const AssetType = z.enum(['MACHINE', 'VEHICLE']);

const AssetStatus = z.enum(['ACTIVE', 'MAINTENANCE', 'BROKEN', 'INACTIVE']);

const MaintenanceType = z.enum(['ROUTINE', 'INSPECTION', 'INSURANCE', 'REPAIR']);

const Asset = z.object({
  id: Id,
  factoryId: Id,
  type: AssetType,
  name: z.string(),
  code: z.string(),
  licensePlate: z.string().nullable(),
  capacityTons: z.number().nullable(),
  status: AssetStatus,
  notes: z.string().nullable(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

const MaintenanceRecord = z.object({
  id: Id,
  factoryId: Id,
  assetId: Id,
  type: MaintenanceType,
  performedAt: IsoDateTime,
  dueAt: IsoDateTime.nullable(),
  cost: z.number().nullable(),
  notes: z.string().nullable(),
  createdAt: IsoDateTime,
});

const assetId = z.object({ id: Id });

/** A date (YYYY-MM-DD) or a full ISO timestamp */
const DateInput = z.string().min(10);

export const assetContracts: ApiContract[] = [
  {
    id: 'listAssets',
    method: 'GET',
    path: '/api/assets',
    tag: 'Assets',
    summary: 'Machines and vehicles with their next maintenance due date',
    auth: roles('ADMIN'),
    query: z.object({ type: AssetType.optional() }),
    response: envelope(
      z.array(
        Asset.extend({
          maintenanceCount: z.number().int(),
          nextDue: IsoDateTime.nullable(),
          nextDueType: MaintenanceType.nullable(),
        })
      )
    ),
    errors: [400, 401, 403, 500],
  },
  {
    id: 'createAsset',
    method: 'POST',
    path: '/api/assets',
    tag: 'Assets',
    summary: 'Create a machine or vehicle',
    auth: roles('ADMIN'),
    body: z.object({
      type: AssetType,
      name: z.string().min(1),
      code: z.string().min(1),
      licensePlate: z.string().optional(),
      capacityTons: z.number().positive().optional(),
      status: AssetStatus.optional(),
      notes: z.string().optional(),
    }),
    successStatus: 201,
    response: envelope(Asset),
    errors: [400, 401, 403, 409, 500],
    notes: 'A VEHICLE requires `licensePlate`; a MACHINE must not have one. 409 when `code` already exists.',
  },
  {
    id: 'updateAsset',
    method: 'PATCH',
    path: '/api/assets/{id}',
    tag: 'Assets',
    summary: 'Update an asset',
    auth: roles('ADMIN'),
    params: assetId,
    body: z.object({
      name: z.string().min(1).optional(),
      licensePlate: z.string().nullable().optional(),
      capacityTons: z.number().positive().nullable().optional(),
      status: AssetStatus.optional(),
      notes: z.string().nullable().optional(),
    }),
    response: envelope(Asset),
    errors: [400, 401, 403, 404, 500],
  },
  {
    id: 'deleteAsset',
    method: 'DELETE',
    path: '/api/assets/{id}',
    tag: 'Assets',
    summary: 'Delete an asset and its maintenance history',
    auth: roles('ADMIN'),
    params: assetId,
    response: envelope(Success),
    errors: [400, 401, 403, 404, 500],
  },
  {
    id: 'listMaintenance',
    method: 'GET',
    path: '/api/assets/{id}/maintenance',
    tag: 'Assets',
    summary: 'Maintenance history of an asset, newest first',
    auth: roles('ADMIN'),
    params: assetId,
    response: envelope(z.array(MaintenanceRecord)),
    errors: [400, 401, 403, 404, 500],
  },
  {
    id: 'createMaintenance',
    method: 'POST',
    path: '/api/assets/{id}/maintenance',
    tag: 'Assets',
    summary: 'Record a maintenance, inspection, insurance or repair',
    auth: roles('ADMIN'),
    params: assetId,
    body: z.object({
      type: MaintenanceType,
      performedAt: DateInput,
      dueAt: DateInput.nullable().optional(),
      cost: z.number().nonnegative().nullable().optional(),
      notes: z.string().nullable().optional(),
    }),
    successStatus: 201,
    response: envelope(MaintenanceRecord),
    errors: [400, 401, 403, 404, 500],
  },
];
