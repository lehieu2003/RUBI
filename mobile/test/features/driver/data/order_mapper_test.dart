import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/driver/data/dto/driver_dtos.dart';
import 'package:iceflow_mobile/features/driver/data/mappers/order_mapper.dart';
import 'package:iceflow_mobile/features/driver/domain/entities/delivery_order.dart';

void main() {
  group('OrderStatus.fromName', () {
    test('map 2 trạng thái chính thức từ server (case-sensitive)', () {
      expect(OrderStatus.fromName('SHIPPING'), OrderStatus.shipping);
      expect(OrderStatus.fromName('DELIVERED'), OrderStatus.delivered);
    });

    test('giá trị lạ/thiếu → shipping (safe-default có chủ ý)', () {
      expect(OrderStatus.fromName('PENDING'), OrderStatus.shipping);
      expect(OrderStatus.fromName(null), OrderStatus.shipping);
      expect(OrderStatus.fromName('delivered'), OrderStatus.shipping); // sai hoa-thường → lạ
    });
  });

  group('OrderMapper.fromDto', () {
    // Fixture khớp contract backend `GET /api/driver/orders`: 2 orders
    // (SHIPPING + DELIVERED), mỗi đơn 2 items, deliveredAt null ở đơn SHIPPING.
    const orderShippingFixture = {
      'id': 'order-1',
      'total': 250000,
      'status': 'SHIPPING',
      'createdAt': '2026-10-07T02:00:00.000Z',
      'deliveredAt': null,
      'driverName': 'Nguyễn Văn Tài',
      'customer': {
        'id': 'cust-1',
        'name': 'Quán Cô Ba',
        'address': '12 Nguyễn Trãi, Q.1',
        'phone': '0903123456',
        'zone': 'extra-bị-bỏ-qua',
      },
      'orderItems': [
        {
          'id': 'item-1',
          'quantity': 10,
          'unitPrice': 20000,
          'lineTotal': 200000,
          'product': {
            'id': 'prod-1',
            'name': 'Đá viên 5kg',
            'sizeKg': 5,
            'unit': 'bao',
          },
        },
        {
          'id': 'item-2',
          'quantity': 2.5,
          'unitPrice': 20000,
          'lineTotal': 50000,
          'product': {
            'id': 'prod-2',
            'name': 'Đá khô',
            'sizeKg': null,
            'unit': 'kg',
          },
        },
      ],
      'note': 'extra-bị-bỏ-qua',
    };

    const orderDeliveredFixture = {
      'id': 'order-2',
      'total': 180000.5,
      'status': 'DELIVERED',
      'createdAt': '2026-10-07T01:00:00.000Z',
      'deliveredAt': '2026-10-07T04:30:00.000Z',
      'driverName': 'Nguyễn Văn Tài',
      'customer': {
        'id': 'cust-2',
        'name': 'Bar Minh',
        'address': '34 Lê Lợi, Q.1',
        'phone': '0912345678',
      },
      'orderItems': [
        {
          'id': 'item-3',
          'quantity': 6,
          'unitPrice': 25000,
          'lineTotal': 150000,
          'product': {'id': 'prod-1', 'name': 'Đá viên 5kg', 'sizeKg': 5, 'unit': 'bao'},
        },
        {
          'id': 'item-4',
          'quantity': 1,
          'unitPrice': 30000.5,
          'lineTotal': 30000.5,
          'product': {'id': 'prod-3', 'name': 'Đá tuyết', 'sizeKg': null, 'unit': 'túi'},
        },
      ],
    };

    final expectedShipping = DeliveryOrder(
      id: 'order-1',
      status: OrderStatus.shipping,
      total: 250000,
      customerName: 'Quán Cô Ba',
      customerAddress: '12 Nguyễn Trãi, Q.1',
      customerPhone: '0903123456',
      items: const [
        OrderItem(
          productName: 'Đá viên 5kg',
          quantity: 10,
          unitPrice: 20000,
          lineTotal: 200000,
        ),
        OrderItem(
          productName: 'Đá khô',
          quantity: 2.5,
          unitPrice: 20000,
          lineTotal: 50000,
        ),
      ],
      createdAt: DateTime.utc(2026, 10, 7, 2),
      deliveredAt: null,
    );

    final expectedDelivered = DeliveryOrder(
      id: 'order-2',
      status: OrderStatus.delivered,
      total: 180000.5,
      customerName: 'Bar Minh',
      customerAddress: '34 Lê Lợi, Q.1',
      customerPhone: '0912345678',
      items: const [
        OrderItem(
          productName: 'Đá viên 5kg',
          quantity: 6,
          unitPrice: 25000,
          lineTotal: 150000,
        ),
        OrderItem(
          productName: 'Đá tuyết',
          quantity: 1,
          unitPrice: 30000.5,
          lineTotal: 30000.5,
        ),
      ],
      createdAt: DateTime.utc(2026, 10, 7, 1),
      deliveredAt: DateTime.utc(2026, 10, 7, 4, 30),
    );

    test('fixture SHIPPING (deliveredAt null) → Ok(DeliveryOrder) đúng dữ liệu', () {
      final res = OrderMapper.fromDto(OrderDto.fromJson(orderShippingFixture));

      expect(res, Ok(expectedShipping));
    });

    test('fixture DELIVERED (có deliveredAt) → Ok(DeliveryOrder) đúng dữ liệu', () {
      final res = OrderMapper.fromDto(OrderDto.fromJson(orderDeliveredFixture));

      expect(res, Ok(expectedDelivered));
    });

    test('status lạ → vẫn Ok với status shipping (safe-default)', () {
      final res = OrderMapper.fromDto(
        OrderDto.fromJson({...orderShippingFixture, 'status': 'PENDING'}),
      );

      expect(
        res,
        Ok(expectedShipping), // Equatable: status shipping == shipping
      );
    });

    test('thiếu id → Err(UnexpectedFailure)', () {
      final res = OrderMapper.fromDto(
        OrderDto.fromJson({...orderShippingFixture}..remove('id')),
      );

      expect((res as Err<DeliveryOrder>).failure, isA<UnexpectedFailure>());
    });

    test('thiếu total → Err(UnexpectedFailure)', () {
      final res = OrderMapper.fromDto(
        OrderDto.fromJson({...orderShippingFixture}..remove('total')),
      );

      expect((res as Err<DeliveryOrder>).failure, isA<UnexpectedFailure>());
    });

    test('thiếu customer.name → Err(UnexpectedFailure)', () {
      final missingName = {
        ...orderShippingFixture,
        'customer': {...(orderShippingFixture['customer'] as Map<String, dynamic>), 'name': null},
      };
      expect(
        OrderMapper.fromDto(OrderDto.fromJson(missingName)),
        isA<Err<DeliveryOrder>>(),
      );
    });

    // Server cho phép bỏ trống SĐT / địa chỉ (lưu ''): đơn vẫn phải giao được.
    test('customer.address / phone rỗng hoặc null → Ok với chuỗi rỗng', () {
      for (final empty in ['', null]) {
        final noContact = {
          ...orderShippingFixture,
          'customer': {
            ...(orderShippingFixture['customer'] as Map<String, dynamic>),
            'address': empty,
            'phone': empty,
          },
        };

        final res = OrderMapper.fromDto(OrderDto.fromJson(noContact));

        expect(res, isA<Ok<DeliveryOrder>>(), reason: 'value: $empty');
        final order = (res as Ok<DeliveryOrder>).value;
        expect(order.customerAddress, '');
        expect(order.customerPhone, '');
        expect(order.customerName, 'Quán Cô Ba');
      }
    });

    test('createdAt thiếu / sai định dạng → Err(UnexpectedFailure)', () {
      final missing = {...orderShippingFixture}..remove('createdAt');
      expect(
        OrderMapper.fromDto(OrderDto.fromJson(missing)),
        isA<Err<DeliveryOrder>>(),
      );

      final garbage = {
        ...orderShippingFixture,
        'createdAt': 'khong-phai-ngay',
      };
      expect(
        OrderMapper.fromDto(OrderDto.fromJson(garbage)),
        isA<Err<DeliveryOrder>>(),
      );
    });

    test('deliveredAt có nhưng sai định dạng → Err(UnexpectedFailure)', () {
      final res = OrderMapper.fromDto(
        OrderDto.fromJson({...orderDeliveredFixture, 'deliveredAt': 'not-a-date'}),
      );

      expect((res as Err<DeliveryOrder>).failure, isA<UnexpectedFailure>());
    });

    test('thiếu orderItems → Err(UnexpectedFailure)', () {
      final res = OrderMapper.fromDto(
        OrderDto.fromJson({...orderShippingFixture}..remove('orderItems')),
      );

      expect((res as Err<DeliveryOrder>).failure, isA<UnexpectedFailure>());
    });

    test('item thiếu product.name / quantity → Err(UnexpectedFailure)', () {
      final missingProductName = {
        ...orderShippingFixture,
        'orderItems': [
          {
            'quantity': 10,
            'unitPrice': 20000,
            'lineTotal': 200000,
            'product': {'id': 'prod-1'},
          },
        ],
      };
      expect(
        OrderMapper.fromDto(OrderDto.fromJson(missingProductName)),
        isA<Err<DeliveryOrder>>(),
      );

      final missingQuantity = {
        ...orderShippingFixture,
        'orderItems': [
          {
            'unitPrice': 20000,
            'lineTotal': 200000,
            'product': {'name': 'Đá viên 5kg'},
          },
        ],
      };
      expect(
        OrderMapper.fromDto(OrderDto.fromJson(missingQuantity)),
        isA<Err<DeliveryOrder>>(),
      );
    });

    test('total là chuỗi → TypeError ném ngay tại DTO (repo giữ lại trong Result)', () {
      // Parse rẻ cố ý: field sai kiểu ném TypeError tại fromJson, không im
      // lặng suy ra null.
      expect(
        () => OrderDto.fromJson({...orderShippingFixture, 'total': '250000'}),
        throwsA(isA<TypeError>()),
      );
    });
  });

  group('OrderMapper — ghi chú của đơn', () {
    OrderDto dto(Object? notes) => OrderDto.fromJson({
          'id': 'order-1',
          'total': 100000,
          'status': 'SHIPPING',
          'createdAt': '2026-10-07T02:00:00.000Z',
          'deliveredAt': null,
          'notes': notes,
          'customer': {'name': 'Quán Cô Ba', 'address': '12 Nguyễn Trãi', 'phone': '0903123456'},
          'orderItems': const <Map<String, dynamic>>[],
        });

    DeliveryOrder mapped(Object? notes) =>
        (OrderMapper.fromDto(dto(notes)) as Ok<DeliveryOrder>).value;

    test('có ghi chú → giữ nguyên nội dung, bỏ khoảng trắng hai đầu', () {
      expect(mapped('Giao cổng sau, gọi trước 10 phút').notes,
          'Giao cổng sau, gọi trước 10 phút');
      expect(mapped('  Gọi trước khi tới  ').notes, 'Gọi trước khi tới');
    });

    test('không có, rỗng, hoặc toàn khoảng trắng → null (không vẽ khung trống)',
        () {
      expect(mapped(null).notes, isNull);
      expect(mapped('').notes, isNull);
      expect(mapped('   ').notes, isNull);
    });
  });
}
