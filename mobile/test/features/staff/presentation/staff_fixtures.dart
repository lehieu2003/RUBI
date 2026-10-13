import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/staff/domain/entities/staff_account.dart';

const boss = StaffAccount(
  id: 'u-admin',
  name: 'Nguyễn Văn Chủ',
  email: 'quanly@rubi.local',
  role: UserRole.admin,
  isActive: true,
);
const van = StaffAccount(
  id: 'u-staff',
  name: 'Nguyễn Thị Vân',
  email: 'van@rubi.local',
  role: UserRole.staff,
  isActive: true,
);
const tai = StaffAccount(
  id: 'u-driver',
  name: 'Phạm Văn Tài',
  email: 'tai@rubi.local',
  role: UserRole.driver,
  isActive: true,
  phone: '0909777888',
);
const lockedLoc = StaffAccount(
  id: 'u-locked',
  name: 'Hoàng Văn Lộc',
  email: 'loc@rubi.local',
  role: UserRole.driver,
  isActive: false,
);
const accounts = [van, tai, lockedLoc, boss];

StaffAccount copyOf(
  StaffAccount account, {
  String? name,
  UserRole? role,
  bool? isActive,
  String? phone,
}) =>
    StaffAccount(
      id: account.id,
      name: name ?? account.name,
      email: account.email,
      role: role ?? account.role,
      isActive: isActive ?? account.isActive,
      phone: phone ?? account.phone,
    );
