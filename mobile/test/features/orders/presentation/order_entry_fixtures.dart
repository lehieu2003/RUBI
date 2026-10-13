import 'package:iceflow_mobile/features/orders/domain/entities/order_entry.dart';

const gioBien = CustomerOption(
  id: 'c-1',
  code: 'KH-001',
  name: 'Quán Nhậu Gió Biển',
  address: '45 Đường Số 7, Thủ Đức',
  phone: '0908123456',
);
const minhTam = CustomerOption(
  id: 'c-2',
  code: 'KH-002',
  name: 'Đại Lý Nước Ngọt Minh Tâm',
  phone: '0911222333',
);
const customers = [gioBien, minhTam];

const priceList = [
  PricedProduct(productId: 'p-1', name: 'Đá Bi', sizeKg: 5, unit: 'Bao', price: 12000, sellable: 145),
  PricedProduct(productId: 'p-2', name: 'Đá Bi', sizeKg: 10, unit: 'Bao', price: 22000, sellable: 2),
  // Chưa có giá, chưa từng có số tồn.
  PricedProduct(productId: 'p-3', name: 'Đá Tuyết', sizeKg: 20, unit: 'Bao'),
];

const created = CreatedOrder(
  id: 'order-abc123',
  total: 36000,
  customerName: 'Quán Nhậu Gió Biển',
);
