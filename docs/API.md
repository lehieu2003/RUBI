<!-- generated-by: gsd-doc-writer -->
# API Reference

IceFlow SaaS REST API for order and inventory management.

## Authentication

The API uses **JWT (JSON Web Tokens)** for authentication via the `jose` library.

### Cookie-based Session

- **Cookie name**: `auth_token`
- **Cookie settings**: `httpOnly: true`, `secure: true` in production, `sameSite: 'lax'`
- **Token expiration**: 7 days

### JWT Payload

```json
{
  "userId": "string",
  "email": "string",
  "name": "string",
  "role": "ADMIN | ACCOUNTANT | STAFF"
}
```

### Including Credentials

Most endpoints require a valid `auth_token` cookie. Send requests from the same origin to automatically include the cookie.

For cross-origin requests or direct API testing, include the cookie header:

```http
Cookie: auth_token=<your_token>
```

### Auth Service

JWT signing and verification uses `JWT_SECRET` from environment variables.
<!-- VERIFY: JWT_SECRET configuration and token management service URL -->

## Endpoints Overview

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/auth/login` | Login with email/password | No |
| POST | `/api/auth/logout` | Clear session cookie | No |
| GET | `/api/auth/me` | Get current user | Yes |
| POST | `/api/auth/register` | Register new user | No |
| GET | `/api/customers` | List all active customers | Yes |
| GET | `/api/products` | List all active products | Yes |
| GET | `/api/orders` | List orders with filters | Yes |
| PATCH | `/api/orders/[id]/status` | Update order status | Yes |
| POST | `/api/orders/[id]/confirm` | Confirm delivery with GPS | Yes |
| PATCH | `/api/orders/bulk-assign` | Bulk assign orders to driver | Yes |
| GET | `/api/orders/map` | Admin delivery map data | Yes |
| GET | `/api/driver/orders` | Driver delivery view | Yes |
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
    "name": "Nguyen Van A"
  }
}
```

**Error** `401 Unauthorized`
```json
{ "error": "Email hoặc mật khẩu không đúng" }
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

**Request** `GET /api/orders?customerId=xxx&status=CONFIRMED&date=2024-01-15`

Query parameters:
- `customerId` - Filter by customer
- `status` - Filter by status: `DRAFT`, `CONFIRMED`, `PRINTED`, `DELIVERED`
- `date` - Filter by date (YYYY-MM-DD)

**Response** `200 OK`
```json
[
  {
    "id": "clx...",
    "status": "CONFIRMED",
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

### Confirm Delivery

**Request** `POST /api/orders/[id]/confirm`
```json
{
  "gps": {
    "lat": 10.8231,
    "lng": 106.6297
  }
}
```

Set `gps: null` if GPS capture failed.

**Response** `200 OK`
```json
{
  "success": true,
  "orderId": "clx...",
  "status": "DELIVERED",
  "deliveryGps": { "lat": 10.8231, "lng": 106.6297 }
}
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

### Admin Delivery Map

**Request** `GET /api/orders/map?date=2024-01-15&driverId=xxx`

Query parameters:
- `date` - Filter by date, defaults to today
- `driverId` - Filter by specific driver (optional)

**Response** `200 OK`
```json
[
  {
    "id": "...",
    "status": "DELIVERED",
    "customerName": "Customer Name",
    "customerAddress": "123 Street",
    "customerPhone": "0912...",
    "deliveryGps": { "lat": 10.8231, "lng": 106.6297 },
    "driverName": "Driver Name",
    "driverId": "...",
    "createdAt": "2024-01-15T..."
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

**PATCH /api/staff/[id]** - Update staff
```json
{
  "isActive": false,
  "password": "newpassword",
  "role": "ACCOUNTANT",
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
| 409 | Conflict - Email already registered |
| 500 | Internal Server Error |

### Common Error Messages

| Message | Status | Description |
|---------|--------|-------------|
| `Thiếu email hoặc mật khẩu` | 400 | Login request missing credentials |
| `Email hoặc mật khẩu không đúng` | 401 | Invalid email or password |
| `Tài khoản đã bị vô hiệu hóa` | 403 | User account is deactivated |
| `Unauthorized` | 401 | No valid session |
| `Admin only` | 403 | Action restricted to ADMIN role |
| `Email đã được đăng ký` | 409 | Email already exists during registration |

## Rate Limits

No rate limiting is currently configured on the API.

<!-- VERIFY: Rate limit configuration for production deployment -->