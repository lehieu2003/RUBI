import 'package:iceflow_mobile/features/customers/domain/entities/customer.dart';

const gioBien = Customer(
  id: 'c-1',
  code: 'KH-001',
  name: 'Quán Nhậu Gió Biển',
  address: '45 Đường Số 7, Thủ Đức',
  phone: '0908123456',
);
const minhTam = Customer(id: 'c-2', code: 'KH-002', name: 'Đại Lý Nước Ngọt Minh Tâm');
const customers = [gioBien, minhTam];

const prices = [
  CustomerPrice(productId: 'p-1', name: 'Đá Bi', sizeKg: 5, unit: 'Bao', price: 12000, basePrice: 12000),
  CustomerPrice(productId: 'p-2', name: 'Đá Tuyết', sizeKg: 20, unit: 'Bao'),
];

/// Bảng giá khi khách đã có giá riêng cho Đá Bi 5kg.
const pricesWithOwn = [
  CustomerPrice(productId: 'p-1', name: 'Đá Bi', sizeKg: 5, unit: 'Bao', price: 11000, basePrice: 12000, customPrice: 11000),
  CustomerPrice(productId: 'p-2', name: 'Đá Tuyết', sizeKg: 20, unit: 'Bao'),
];
