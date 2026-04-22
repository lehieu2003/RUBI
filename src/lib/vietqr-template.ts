export type VietQRData = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  amount?: number;
  note?: string;
};

export function formatVietQRString(data: VietQRData): string {
  const parts = [
    data.bankName,
    data.accountNumber,
    data.accountHolder,
    data.amount ? data.amount.toString() : '',
    data.note || '',
  ];
  return parts.join('|');
}

export function formatPaymentNote(factoryName: string, subscriptionId: string): string {
  return `Thanh toan IceFlow ${factoryName} - ${subscriptionId.slice(0, 8)}`;
}

export interface VietQRDisplay {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  formattedAccount: string;
  amount?: number;
  note: string;
  qrString: string;
}

export function createVietQRDisplay(
  bankName: string,
  accountNumber: string,
  accountHolder: string,
  amount?: number,
  note?: string
): VietQRDisplay {
  const formattedAccount = accountNumber.length > 8
    ? `${accountNumber.slice(0, 4)}xxxx${accountNumber.slice(-4)}`
    : accountNumber;

  const qrData: VietQRData = {
    bankName,
    accountNumber,
    accountHolder,
    amount,
    note,
  };

  return {
    bankName,
    accountNumber,
    accountHolder,
    formattedAccount,
    amount,
    note: note || '',
    qrString: formatVietQRString(qrData),
  };
}
