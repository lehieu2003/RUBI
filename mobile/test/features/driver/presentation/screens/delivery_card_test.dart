import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/features/driver/domain/entities/delivery_order.dart';
import 'package:iceflow_mobile/features/driver/presentation/widgets/delivery_card.dart';

/// Fixture đơn giao 2 mặt hàng, đang giao.
DeliveryOrder buildOrder({
  OrderStatus status = OrderStatus.shipping,
  List<OrderItem>? items,
  String? notes,
  String customerAddress = '123 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM',
  String customerPhone = '0903123456',
}) {
  return DeliveryOrder(
    id: 'o-1',
    status: status,
    total: 350000,
    customerName: 'Nguyễn Văn A',
    customerAddress: customerAddress,
    customerPhone: customerPhone,
    items:
        items ??
        const [
          OrderItem(
            productName: 'đá 10kg',
            quantity: 2,
            unitPrice: 50000,
            lineTotal: 100000,
          ),
          OrderItem(
            productName: 'đá 5kg',
            quantity: 1,
            unitPrice: 30000,
            lineTotal: 30000,
          ),
        ],
    createdAt: DateTime(2026, 10, 7, 8),
    notes: notes,
  );
}

Future<void> pumpCard(
  WidgetTester tester,
  DeliveryOrder order, {
  bool readOnly = false,
  bool isConfirming = false,
  VoidCallback? onConfirm,
}) {
  return tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: DeliveryCard(
          order: order,
          readOnly: readOnly,
          isConfirming: isConfirming,
          onConfirm: onConfirm ?? () {},
          onCall: () {},
          onDirections: () {},
        ),
      ),
    ),
  );
}

void main() {
  group('DeliveryCard — SHIPPING', () {
    testWidgets('render đủ tên / địa chỉ / items / tổng / badge / 3 nút', (
      tester,
    ) async {
      await pumpCard(tester, buildOrder());

      expect(find.text('Nguyễn Văn A'), findsOneWidget);
      expect(find.textContaining('123 Lê Lợi'), findsOneWidget);
      // Items summary: đủ số lượng + tên sản phẩm.
      expect(find.text('2 đá 10kg, 1 đá 5kg'), findsOneWidget);
      // Tổng format tiền VN.
      expect(find.text('${AppStrings.totalLabel}: 350.000đ'), findsOneWidget);
      // Badge trạng thái.
      expect(find.text(AppStrings.badgeShipping), findsOneWidget);
      // Hàng nút.
      expect(
        find.widgetWithText(OutlinedButton, AppStrings.callButton),
        findsOneWidget,
      );
      expect(
        find.widgetWithText(OutlinedButton, AppStrings.directionsButton),
        findsOneWidget,
      );
      expect(
        find.widgetWithText(FilledButton, AppStrings.confirmDeliveredButton),
        findsOneWidget,
      );
    });

    testWidgets('>2 mặt hàng → hiện "+N sản phẩm khác"', (tester) async {
      await pumpCard(
        tester,
        buildOrder(
          items: List.generate(
            4,
            (i) => OrderItem(
              productName: 'đá $i',
              quantity: 1,
              unitPrice: 10000,
              lineTotal: 10000,
            ),
          ),
        ),
      );

      expect(find.textContaining(AppStrings.productsOther(2)), findsOneWidget);
    });
  });

  group('DeliveryCard — khách thiếu SĐT / địa chỉ', () {
    testWidgets('SĐT rỗng → ẩn nút Gọi, giữ Chỉ đường + xác nhận', (
      tester,
    ) async {
      await pumpCard(tester, buildOrder(customerPhone: ''));

      expect(
        find.widgetWithText(OutlinedButton, AppStrings.callButton),
        findsNothing,
      );
      expect(
        find.widgetWithText(OutlinedButton, AppStrings.directionsButton),
        findsOneWidget,
      );
      expect(
        find.widgetWithText(FilledButton, AppStrings.confirmDeliveredButton),
        findsOneWidget,
      );
    });

    testWidgets('địa chỉ rỗng → ẩn nút Chỉ đường, giữ Gọi + xác nhận', (
      tester,
    ) async {
      await pumpCard(tester, buildOrder(customerAddress: ''));

      expect(
        find.widgetWithText(OutlinedButton, AppStrings.directionsButton),
        findsNothing,
      );
      expect(
        find.widgetWithText(OutlinedButton, AppStrings.callButton),
        findsOneWidget,
      );
      expect(
        find.widgetWithText(FilledButton, AppStrings.confirmDeliveredButton),
        findsOneWidget,
      );
    });

    testWidgets('cả hai rỗng → không nút Gọi / Chỉ đường, vẫn xác nhận được', (
      tester,
    ) async {
      var confirmed = false;
      await pumpCard(
        tester,
        buildOrder(customerPhone: '', customerAddress: ''),
        onConfirm: () => confirmed = true,
      );

      expect(find.byType(OutlinedButton), findsNothing);
      expect(find.text('Nguyễn Văn A'), findsOneWidget);
      await tester.tap(
        find.widgetWithText(FilledButton, AppStrings.confirmDeliveredButton),
      );
      expect(confirmed, isTrue);
    });
  });

  group('DeliveryCard — DELIVERED', () {
    testWidgets('badge "Đã giao", ẨN nút xác nhận, giữ Gọi + Chỉ đường', (
      tester,
    ) async {
      await pumpCard(tester, buildOrder(status: OrderStatus.delivered));

      expect(find.text(AppStrings.badgeDelivered), findsOneWidget);
      expect(find.text(AppStrings.badgeShipping), findsNothing);
      expect(
        find.widgetWithText(FilledButton, AppStrings.confirmDeliveredButton),
        findsNothing,
      );
      expect(
        find.widgetWithText(OutlinedButton, AppStrings.callButton),
        findsOneWidget,
      );
      expect(
        find.widgetWithText(OutlinedButton, AppStrings.directionsButton),
        findsOneWidget,
      );
    });
  });

  group('DeliveryCard — readOnly (dùng lại cho list lịch sử, Task 15)', () {
    testWidgets('không render hàng nút nào', (tester) async {
      await pumpCard(tester, buildOrder(), readOnly: true);

      expect(
        find.widgetWithText(OutlinedButton, AppStrings.callButton),
        findsNothing,
      );
      expect(
        find.widgetWithText(OutlinedButton, AppStrings.directionsButton),
        findsNothing,
      );
      expect(
        find.widgetWithText(FilledButton, AppStrings.confirmDeliveredButton),
        findsNothing,
      );
      // Nội dung thông tin vẫn hiển thị.
      expect(find.text('Nguyễn Văn A'), findsOneWidget);
      expect(find.text(AppStrings.badgeShipping), findsOneWidget);
    });
  });

  group('DeliveryCard — đang xác nhận', () {
    testWidgets('nút xác nhận disabled + spinner', (tester) async {
      await pumpCard(tester, buildOrder(), isConfirming: true);

      final button = tester.widget<FilledButton>(
        find.byType(FilledButton),
      );
      expect(button.onPressed, isNull);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });
  });

  testWidgets('màn hình nhỏ 320dp → không overflow', (tester) async {
    tester.view.physicalSize = const Size(320, 568);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await pumpCard(tester, buildOrder());
    expect(tester.takeException(), isNull);
  });

  testWidgets('có ghi chú → hiện trong khung riêng; không có → không có khung',
      (tester) async {
    await pumpCard(tester, buildOrder(notes: 'Giao cổng sau, gọi trước 10 phút'));
    expect(
      find.descendant(
        of: find.byKey(const Key('delivery_notes')),
        matching: find.text('Giao cổng sau, gọi trước 10 phút'),
      ),
      findsOneWidget,
    );

    await pumpCard(tester, buildOrder());
    expect(find.byKey(const Key('delivery_notes')), findsNothing);
  });

  testWidgets('đơn đã giao trong lịch sử vẫn hiện ghi chú', (tester) async {
    await pumpCard(
      tester,
      buildOrder(status: OrderStatus.delivered, notes: 'Để ở quầy'),
      readOnly: true,
    );
    expect(find.text('Để ở quầy'), findsOneWidget);
  });

  testWidgets('ghi chú rất dài trên màn hình 320dp → không overflow',
      (tester) async {
    tester.view.physicalSize = const Size(320, 568);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await pumpCard(
      tester,
      buildOrder(notes: 'Giao cổng sau, gọi trước 10 phút, ' * 12),
    );
    expect(tester.takeException(), isNull);
  });
}
