<!-- generated-by: gsd-doc-writer -->
# API Reference

IceFlow REST API for order and inventory management at Nhà máy đá tinh khiết Rubi (single factory).

## Authentication

The API uses **JWT (JSON Web Tokens)** for authentication via the `jose` library.

### Cookie-based Session (Staff/Admin)

- **Cookie name**: `auth_token`
- **Cookie settings**: `httpOnly: true`, `secure: true` in production, `sameSite: 'lax'`
- **Token expiration**: 7 days

### JWT Payload

```json
{
  "userId": "string",
  "email": "string",
  "name": "string",
  "role": "ADMIN | STAFF | DRIVER",
  "factoryId": "string"
}
```

Note: there is no registration endpoint. Accounts are created by the factory ADMIN via `POST /api/staff`.

### Including Credentials

Most endpoints require a valid `auth_token` cookie. Send requests from the same origin to automatically include the cookie.

For cross-origin requests or direct API testing, include the cookie header:

```http
Cookie: auth_token=<your_token>
```

### Driver Token Authentication

The driver delivery confirmation endpoint uses a separate Bearer token authentication:

```http
Authorization: Bearer <driver_token>
```

Driver tokens are generated when creating a driver record and used instead of session cookies.

### Auth Service

JWT signing and verification uses `JWT_SECRET` from environment variables.
<!-- VERIFY: JWT_SECRET configuration and token management service URL -->

## Endpoints Overview

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/auth/login` | Login with email/password | No |
| POST | `/api/auth/logout` | Clear session cookie | No |
| GET | `/api/auth/me` | Get current user | Yes |
| GET | `/api/factory` | Factory profile (name, phone, address) | Admin only |
| PATCH | `/api/factory` | Update the factory profile | Admin only |
| GET | `/api/customers` | List all active customers | Yes |
| POST | `/api/customers` | Create new customer | Admin only |
| GET | `/api/products` | List all active products | Yes |
| GET | `/api/drivers` | List all active drivers | Yes |
| POST | `/api/drivers` | Create new driver | Admin only |
| GET | `/api/orders` | List orders with filters | ADMIN, STAFF |
| PATCH | `/api/orders/[id]/status` | Update order status | Yes |
| PATCH | `/api/orders/[id]/confirm` | Confirm delivery (driver) | Driver session or Bearer token |
| PATCH | `/api/orders/[id]/reconcile` | Reconcile order (confirm qty, create debt) | Admin only |
| PATCH | `/api/orders/bulk-assign` | Bulk assign orders to driver | Yes |
| GET | `/api/driver/orders` | Driver delivery view | Driver token |
| GET | `/api/deposits/shells` | List shell deposit balances | Admin only |
| PATCH | `/api/deposits/shells` | Update shell deposit (shells out/in) | Admin only |
| GET | `/api/reports/debt` | Customer debt report | Admin only |
| GET | `/api/staff` | List all staff members | Admin only |
| POST | `/api/staff` | Create new staff member | Admin only |
| PATCH | `/api/staff/[id]` | Update staff member | Admin only |
| DELETE | `/api/staff/[id]` | Soft delete staff member | Admin only |
| POST | `/api/prices/global` | Set global product price | Yes |
| POST | `/api/prices/customer/override` | Set customer price override | Yes |
| DELETE | `/api/prices/customer/override` | Remove customer price override | Yes |

## Request/Response Formats

### Login

**Request** `POST /api/auth/login`
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** `200 OK`
```json
{
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "name": "Nguyen Van A",
    "role": "ADMIN"
  }
}
```

**Error** `401 Unauthorized`
```json
{ "error": "Email hoặc mật khẩu không đúng" }
```

**Error** `403 Forbidden`
```json
{ "error": "Tài khoản đã bị vô hiệu hóa" }
```

### Get Current User

**Request** `GET /api/auth/me`

**Response** `200 OK`
```json
{
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "name": "Nguyen Van A",
    "role": "ADMIN",
    "isActive": true
  }
}
```

**Error** `401 Unauthorized`
```json
{ "user": null }
```

### List Orders

**Request** `GET /api/orders?customerId=xxx&status=SHIPPING&date=2024-01-15`

Query parameters:
- `customerId` - Filter by customer
- `status` - Filter by status: `PENDING`, `SHIPPING`, `DELIVERED`, `COMPLETED`, `CANCELLED`
- `date` - Filter by date (YYYY-MM-DD)

**Response** `200 OK`
```json
[
  {
    "id": "clx...",
    "status": "SHIPPING",
    "total": 150000,
    "customer": { "id": "...", "name": "Khach Hang A", "address": "...", "phone": "..." },
    "orderItems": [
      {
        "id": "...",
        "product": { "id": "...", "name": "Ice 5kg", "sizeKg": 5 },
        "quantity": 10,
        "unitPrice": 15000,
        "lineTotal": 150000
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

### Update Order Status

**Request** `PATCH /api/orders/[id]/status`
```json
{
  "status": "SHIPPING",
  "cancellationReason": "optional string for CANCELLED status"
}
```

Valid statuses: `PENDING`, `SHIPPING`, `DELIVERED`, `COMPLETED`, `CANCELLED`

**Response** `200 OK`
```json
{
  "id": "clx...",
  "status": "SHIPPING",
  "notes": null
}
```

**Error** `400 Bad Request`
```json
{ "error": "Cancellation reason is required when cancelling an order" }
```

### Confirm Delivery (Driver)

**Request** `PATCH /api/orders/[id]/confirm`
```http
Authorization: Bearer <driver_token>
```

No request body is required. No GPS location is captured or stored.

**Response** `200 OK`
```json
{
  "success": true,
  "orderId": "clx...",
  "status": "DELIVERED"
}
```

**Error** `401 Unauthorized`
```json
{ "error": "Invalid token" }
```

**Error** `403 Forbidden`
```json
{ "error": "Not authorized to confirm this order" }
```

### Reconcile Order (Confirm Quantities)

**Request** `PATCH /api/orders/[id]/reconcile`
```json
{
  "items": [
    { "id": "order-item-id", "actualQty": 10 }
  ]
}
```

Reconciles delivered quantities, updates order status to `COMPLETED`, creates a DEBT ledger entry for the customer, and deducts inventory. Only `DELIVERED` orders can be reconciled.

**Response** `200 OK`
```json
{
  "success": true,
  "orderId": "clx...",
  "status": "COMPLETED"
}
```

**Error** `400 Bad Request`
```json
{ "error": "Invalid body. Required: items[{id, actualQty}]" }
```

**Error** `400 Bad Request`
```json
{ "error": "Order is DELIVERED, cannot reconcile. Only DELIVERED orders can be reconciled." }
```

### Bulk Assign Orders

**Request** `PATCH /api/orders/bulk-assign`
```json
{
  "orderIds": ["order-id-1", "order-id-2"],
  "driverId": "driver-id"
}
```

**Response** `200 OK`
```json
{
  "success": true,
  "assignedCount": 2,
  "driver": { "id": "...", "name": "Driver Name" }
}
```

### Driver Delivery View

**Request** `GET /api/driver/orders?token=xxx&date=2024-01-15`

Query parameters:
- `token` - Driver authentication token (required)
- `date` - Filter by date, defaults to today

**Response** `200 OK`
```json
{
  "driver": { "id": "...", "name": "Driver Name" },
  "orders": [
    {
      "id": "...",
      "status": "SHIPPING",
      "total": 150000,
      "customer": { "name": "...", "address": "...", "phone": "..." },
      "orderItems": [...],
      "driverName": "Driver Name"
    }
  ]
}
```

### List Drivers

**Request** `GET /api/drivers`

**Response** `200 OK`
```json
[
  { "id": "...", "name": "Driver Name", "phone": "0912..." }
]
```

### Create Driver (Admin Only)

**Request** `POST /api/drivers`
```json
{
  "name": "New Driver",
  "phone": "0912...",
  "isActive": true
}
```

**Response** `201 Created`
```json
{
  "id": "...",
  "name": "New Driver",
  "phone": "0912...",
  "slug": "new-driver-abc123",
  "isActive": true,
  "token": "driver-auth-token..."
}
```

### Shell Deposits

**GET /api/deposits/shells** - List deposit balances
```json
[
  {
    "customerId": "...",
    "customerName": "Customer Name",
    "shellsOut": 10,
    "shellsIn": 3,
    "depositPerShell": 50000,
    "netDepositOwed": 350000
  }
]
```

**PATCH /api/deposits/shells** - Update deposit
```json
{
  "customerId": "customer-id",
  "shellsOut": 5,
  "shellsIn": 2
}
```

### Debt Report

**GET /api/reports/debt** - Customer debt report (sorted by outstanding debt descending)
```json
[
  {
    "customerId": "...",
    "customerName": "Customer Name",
    "outstandingDebt": 150000,
    "lastPaymentDate": "2024-01-10T..."
  }
]
```

### Staff Management (Admin Only)

**GET /api/staff** - List all staff
```json
{
  "users": [
    { "id": "...", "name": "...", "email": "...", "role": "STAFF", "isActive": true, "createdAt": "..." }
  ]
}
```

**POST /api/staff** - Create new staff
```json
{
  "name": "New Staff",
  "email": "staff@example.com",
  "password": "password123",
  "role": "STAFF"
}
```

Valid roles: `ADMIN`, `STAFF`, `DRIVER`

**PATCH /api/staff/[id]** - Update staff
```json
{
  "isActive": false,
  "password": "newpassword",
  "role": "STAFF",
  "name": "Updated Name"
}
```

**DELETE /api/staff/[id]** - Soft delete (sets `isActive=false`)

### Pricing

**POST /api/prices/global** - Set global price
```json
{
  "productId": "product-id",
  "price": 15000
}
```

**POST /api/prices/customer/override** - Set customer-specific price
```json
{
  "customerId": "customer-id",
  "productId": "product-id",
  "price": 14000
}
```

**DELETE /api/prices/customer/override?customerId=xxx&productId=xxx** - Remove override

## Error Codes

### Standard Error Response

```json
{
  "error": "Error message in Vietnamese"
}
```

### HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input or missing required fields |
| 401 | Unauthorized - Invalid or missing session |
| 403 | Forbidden - Insufficient permissions (e.g., non-admin accessing staff endpoints) |
| 404 | Not Found - Resource does not exist |
| 409 | Conflict - Email already in use |
| 500 | Internal Server Error |

### Common Error Messages

| Message | Status | Description |
|---------|--------|-------------|
| `Thiếu email hoặc mật khẩu` | 400 | Login request missing credentials |
| `Thiếu thông tin bắt buộc` | 400 | Required fields missing in request |
| `Email hoặc mật khẩu không đúng` | 401 | Invalid email or password |
| `Tài khoản đã bị vô hiệu hóa` | 403 | User account is deactivated |
| `Unauthorized` | 401 | No valid session |
| `Admin only` | 403 | Action restricted to ADMIN role |
| `Forbidden` | 403 | Insufficient role permissions |
| `Email đã được đăng ký` | 409 | Email already exists when creating a staff account |
| `Không thể tự sửa tài khoản` | 400 | Admin attempting to modify own account |
| `Không thể tự xóa tài khoản` | 400 | Admin attempting to delete own account |

## Rate Limits

No rate limiting is currently configured on the API.

<!-- VERIFY: Rate limit configuration for production deployment -->
