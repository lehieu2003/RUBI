---
status: resolved
trigger: "H3 from .planning/audits/2026-10-15-user-behavior-ui-logic-audit.md: one customer with an empty phone or address blocks the driver's whole delivery list on mobile. The server stores phone/address as '' when omitted, the driver order mapper rejects empty values, and one mapping error fails the whole list (Today and History). Fix in the Flutter app, with regression tests."
created: 2026-10-15
updated: 2026-10-15
branch: fix/mobile-driver-empty-contact
---

# Debug Session: Driver List Empty Contact

## Symptoms

Source: audit-reviewer-verified finding H3 (raw: `.planning/audits/2026-10-15-raw/04-flutter-auditor.md` FL-2). Not reproduced at runtime yet.

- **Expected:** The driver's "Đơn hôm nay" and "Lịch sử" lists show every assigned order. For an order whose customer has no phone or address, the call / directions actions are hidden (or disabled), and the rest of the card works, including delivery confirmation.
- **Actual (from code reading):**
  - Server allows omitting both: `src/lib/contracts/customers.ts:37-38` (optional), and `src/app/api/customers/route.ts:57` stores `address: address || '', phone: phone || ''`.
  - `mobile/lib/features/driver/data/mappers/order_mapper.dart:30-37` uses `MappingValidator.nonEmpty(customer?.phone)` (`mobile/lib/core/network/mapping_validator.dart:9-10`) and returns `Err(...missing('Order', 'customer.phone'))` when empty; same for address.
  - `mobile/lib/features/driver/data/driver_repository_impl.dart:44-50` returns `Err(failure)` for the whole list on the first mapping error.
  - Today tab shows the full-screen error (`mobile/lib/features/driver/presentation/screens/today_tab.dart:40-44`); history fails the same way (`history_cubit.dart:94`).
  - The order-entry mapper already accepts empty values (`mobile/lib/features/orders/data/mappers/order_entry_mapper.dart:21-23`).
- **Error messages:** "Có lỗi xảy ra" full-screen error on the Today tab.
- **Timeline:** since the driver mapper was written; current test `mobile/test/features/driver/data/order_mapper_test.dart:188-209` asserts `Err` for an empty phone, encoding the bug.
- **Reproduction:** Manager creates a customer without a phone → an order for that customer is assigned to a driver → driver opens "Đơn hôm nay" → error screen, no order can be confirmed.

## Constraints

- Change only the Flutter app under `mobile/` unless evidence shows a server change is required (it should not be: the server contract says the fields are optional).
- Keep it surgical: make phone/address optional in the driver order entity/mapper (or default to ''), and hide the call/directions UI when empty. Do not change unrelated mappers.
- Gate: Mobile Quality Gate = `flutter analyze` and `flutter test` (run from `mobile/`). Do not run the integration test against any remote server; never touch the Supabase DB in the repo's `.env`.
- Conventional Commits, one logical change each.

## Current Focus

- reasoning_checkpoint:
  - hypothesis: OrderMapper.fromDto (driver) returns Err for '' / null customer.phone or customer.address; DriverRepositoryImpl.getOrders aborts the whole list on that Err; Today/History then show the error screen.
  - confirming_evidence: RED mapper test (Err missing `customer.address`); RED repository test (2 orders, one with '' contact -> not Ok); code at order_mapper.dart:30-37 and driver_repository_impl.dart:44-50.
  - falsification_test: after defaulting to '' in the mapper, the repository test with one contact-less order must return both orders.
  - fix_rationale: phone/address are optional per server contract; the mapper must model that, and the only UI consumers of the values (DeliveryCard buttons -> today_tab tel:/maps launchers) must not offer actions for empty values.
  - blind_spots: repository still fails the whole list for genuinely broken payloads (missing id/total/name/items) — left as is (out of scope, deliberate contract check).
- tdd_checkpoint: {test_files: [order_mapper_test.dart, driver_repository_impl_test.dart, delivery_card_test.dart], status: green}
- next_action: none — resolved

## Evidence

- timestamp: 2026-10-15
  checked: mobile/lib/features/driver/data/mappers/order_mapper.dart:30-37
  found: `MappingValidator.nonEmpty(customer?.phone/address)` -> `Err(missing(...))` when null or ''.
  implication: a customer saved with phone '' or address '' (server default) cannot be mapped.
- timestamp: 2026-10-15
  checked: mobile/lib/features/driver/data/driver_repository_impl.dart:44-50
  found: the loop returns `Err(failure)` on the first mapping failure.
  implication: one bad order fails the whole Today/History list.
- timestamp: 2026-10-15
  checked: consumers of DeliveryOrder.customerPhone/customerAddress
  found: only delivery_card.dart (address Text + Gọi/Chỉ đường buttons, hidden when readOnly), today_tab.dart (_launchCall tel:, _launchDirections google maps), today_orders_cubit.dart:129-130 (copy only). History uses DeliveryCard(readOnly: true). The office mapper (office_order_mapper.dart:78-79) already defaults to ''.
  implication: fix = default '' in the driver mapper + hide the actions in DeliveryCard when the value is empty, so tel:/maps are never launched with ''.
- timestamp: 2026-10-15
  checked: TDD RED — `flutter test test/features/driver` after adding/changing tests
  found: 80 passed, 5 failed, all new tests:
    - order_mapper_test "customer.address / phone rỗng hoặc null → Ok với chuỗi rỗng": Expected Ok<DeliveryOrder>, Actual Err(UnexpectedFailure(Order payload missing `customer.address`))
    - driver_repository_impl_test "1 khách không có SĐT / địa chỉ → vẫn trả đủ mọi đơn": Expected res.isOk true, Actual false
    - delivery_card_test "SĐT rỗng → ẩn nút Gọi" / "địa chỉ rỗng → ẩn nút Chỉ đường": Expected no matching candidates, Actual found 1 OutlinedButton
    - delivery_card_test "cả hai rỗng": Expected no OutlinedButton, Actual found 2
  implication: bug reproduced via tests; hypothesis confirmed (mapper rejects '' contact, whole list fails, card always shows both actions).
- timestamp: 2026-10-15
  checked: TDD GREEN + Mobile Quality Gate after fix (from mobile/)
  found: `flutter test test/features/driver` -> +85 All tests passed; `flutter analyze` -> No issues found! (ran in 1.6s); `flutter test` -> 00:14 +636: All tests passed!
  implication: fix verified, no regressions.

## Eliminated

## Resolution

- root_cause: The driver OrderMapper treated customer.phone and customer.address as required (`MappingValidator.nonEmpty` -> `Err(missing(...))`), but the server stores them as '' when omitted. DriverRepositoryImpl.getOrders returns Err on the first mapping failure, so one customer without phone/address made the whole "Đơn hôm nay" / "Lịch sử" list fail with the error screen.
- fix: Mapper defaults phone/address to '' (same as office_order_mapper). DeliveryCard hides the Gọi button when the phone is empty, the Chỉ đường button and address line when the address is empty, and the whole action row when both are; the confirm button stays. today_tab's tel:/maps launchers are only reachable through those buttons, so an empty value is never launched.
- verification: New/changed tests went RED (5 failures, see Evidence) then GREEN. `flutter analyze`: No issues found. `flutter test`: +636 All tests passed.
- files_changed: [mobile/lib/features/driver/data/mappers/order_mapper.dart, mobile/lib/features/driver/presentation/widgets/delivery_card.dart, mobile/test/features/driver/data/order_mapper_test.dart, mobile/test/features/driver/data/driver_repository_impl_test.dart, mobile/test/features/driver/presentation/screens/delivery_card_test.dart]
