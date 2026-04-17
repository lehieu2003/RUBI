import * as XLSX from 'xlsx';

interface CustomerWithDebt {
  code: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  debtLedger?: Array<{ amount: number; type: string }>;
  shellDeposit?: { shellsOut: number; depositPerShell: number };
}

interface Order {
  id: string;
  createdAt: string | Date;
  total: number;
  status: string;
  customer?: { name: string };
}

export function exportCustomerDebtExcel(customers: CustomerWithDebt[], orders: Order[]): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Customer list with debt
  const sheet1Data = customers.map(c => {
    // Calculate total debt from ledger (DEBT type adds, PAYMENT type subtracts)
    const totalDebt = (c.debtLedger || []).reduce((sum, entry) => {
      if (entry.type === 'DEBT') return sum + Number(entry.amount);
      if (entry.type === 'PAYMENT') return sum - Number(entry.amount);
      return sum;
    }, 0);

    // Calculate shell deposit owed
    const shellDeposit = c.shellDeposit
      ? Number(c.shellDeposit.shellsOut) * Number(c.shellDeposit.depositPerShell)
      : 0;

    return {
      'Mã khách hàng': c.code,
      'Tên khách hàng': c.name,
      'Số điện thoại': c.phone || '',
      'Địa chỉ': c.address || '',
      'Công nợ': totalDebt,
      'Tiền đặt cọc vỏ': shellDeposit,
    };
  });

  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  XLSX.utils.book_append_sheet(wb, ws1, 'Cong No');

  // Sheet 2: Order history (last 3-6 months)
  const sheet2Data = orders.map(o => ({
    'Mã đơn': o.id,
    'Khách hàng': o.customer?.name || '',
    'Ngày tạo': o.createdAt instanceof Date ? o.createdAt.toISOString().split('T')[0] : o.createdAt,
    'Tổng tiền': o.total,
    'Trạng thái': o.status,
  }));

  const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
  XLSX.utils.book_append_sheet(wb, ws2, 'Lich Su Don Hang');

  // Trigger browser download
  XLSX.writeFile(wb, 'iceflow-export.xlsx');
}
