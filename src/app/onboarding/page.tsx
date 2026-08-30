'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'done';

interface CustomerRow {
  code: string;
  name: string;
  phone: string;
  address: string;
}

const FIELD_KEYS = ['code', 'name', 'phone', 'address'] as const;
const FIELD_LABELS: Record<typeof FIELD_KEYS[number], string> = {
  code: 'Mã khách',
  name: 'Tên khách',
  phone: 'Số điện thoại',
  address: 'Địa chỉ',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<typeof FIELD_KEYS[number], number>>({
    code: 0,
    name: 1,
    phone: 2,
    address: 3,
  });
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<string[]>(file, {
      complete: results => {
        const data = results.data;
        if (data.length > 0) {
          setHeaders(data[0]);
          setCsvData(
            data.slice(1).filter(row => row.some(cell => String(cell).trim()))
          );
        }
        setStep('mapping');
      },
      skipEmptyLines: true,
    });
  };

  const handleMapping = () => {
    const mapped: CustomerRow[] = csvData
      .map(row => ({
        code: String(row[mapping.code] ?? '').trim(),
        name: String(row[mapping.name] ?? '').trim(),
        phone: String(row[mapping.phone] ?? '').trim(),
        address: String(row[mapping.address] ?? '').trim(),
      }))
      .filter(c => c.code && c.name);
    setCustomers(mapped);
    setStep('preview');
  };

  const handleImport = async () => {
    setStep('importing');
    try {
      const res = await fetch(API_ENDPOINTS.CUSTOMERS.IMPORT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? 'Không thể import khách hàng');
      setImportResult({
        imported: result.imported ?? 0,
        skipped: result.skipped ?? 0,
      });

      // REG-04: Mark onboarding complete after successful import
      const onboardingRes = await fetch(API_ENDPOINTS.FACTORY.ONBOARDING, {
        method: 'PATCH',
      });
      if (!onboardingRes.ok) throw new Error('Đã import nhưng không thể cập nhật onboarding');
      toast({
        type: 'success',
        title: 'Import thành công',
        message: `Đã nhập ${result.imported ?? 0} khách hàng`,
      });
    } catch (err) {
      toast({
        type: 'error',
        title: 'Import thất bại',
        message: err instanceof Error ? err.message : 'Không thể nhập dữ liệu khách hàng',
      });
      setImportResult({ imported: 0, skipped: customers.length });
    }
    setStep('done');
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-2">Nhập dữ liệu khách hàng</h1>
      <p className="text-gray-500 mb-6">
        Nhập danh sách khách hàng từ file CSV để bắt đầu sử dụng IceFlow.
      </p>

      {/* Step indicators */}
      <div className="flex gap-2 mb-6 text-xs">
        {['Tải file', 'Map cột', 'Xác nhận', 'Hoàn tất'].map((label, i) => {
          const stepNames: Step[] = ['upload', 'mapping', 'preview', 'done'];
          const active = step === stepNames[i] || (step === 'importing' && i === 2);
          return (
            <div
              key={label}
              className={`px-3 py-1 rounded-full font-medium ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {i + 1}. {label}
            </div>
          );
        })}
      </div>

      {step === 'upload' && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-medium mb-2">Bước 1: Tải lên file CSV</h2>
          <p className="text-gray-600 text-sm mb-4">
            File CSV cần có các cột: Mã khách, Tên khách, Số điện thoại, Địa chỉ (có thể
            theo bất kỳ thứ tự nào — bạn sẽ map ở bước tiếp theo).
          </p>
          <label className="block">
            <span className="sr-only">Chọn file CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </label>
        </div>
      )}

      {step === 'mapping' && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-medium mb-4">Bước 2: Map cột dữ liệu</h2>
          <p className="text-sm text-gray-500 mb-4">
            Chọn cột tương ứng trong file CSV cho từng trường dữ liệu.
          </p>
          <div className="space-y-3">
            {FIELD_KEYS.map(key => (
              <div key={key} className="flex items-center gap-4">
                <span className="w-36 text-sm font-medium text-gray-700">
                  {FIELD_LABELS[key]}:
                </span>
                <select
                  value={mapping[key]}
                  onChange={e =>
                    setMapping(prev => ({ ...prev, [key]: parseInt(e.target.value) }))
                  }
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      [{i}] {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button
            onClick={handleMapping}
            className="mt-5 px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Tiếp tục
          </button>
        </div>
      )}

      {step === 'preview' && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-medium mb-4">
            Bước 3: Xác nhận ({customers.length} khách hàng)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Mã</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Tên</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    Điện thoại
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Địa chỉ</th>
                </tr>
              </thead>
              <tbody>
                {customers.slice(0, 8).map((c, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 px-3 font-mono text-xs">{c.code}</td>
                    <td className="py-2 px-3">{c.name}</td>
                    <td className="py-2 px-3 text-gray-500">{c.phone}</td>
                    <td className="py-2 px-3 text-gray-500 truncate max-w-xs">
                      {c.address}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {customers.length > 8 && (
            <p className="text-gray-500 text-sm mb-4">
              ... và {customers.length - 8} khách hàng nữa
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setStep('mapping')}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Quay lại
            </button>
            <button
              onClick={handleImport}
              className="px-5 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Nhập {customers.length} khách hàng
            </button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="bg-white rounded-lg border p-12 text-center">
          <div className="text-4xl mb-3">...</div>
          <p className="text-gray-600">Đang nhập dữ liệu...</p>
        </div>
      )}

      {step === 'done' && importResult && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-medium mb-4">Hoàn tất!</h2>
          <div className="space-y-2 mb-6">
            <p className="text-green-700 font-medium">
              Đã nhập thành công: <strong>{importResult.imported}</strong> khách hàng
            </p>
            {importResult.skipped > 0 && (
              <p className="text-gray-500 text-sm">
                Đã bỏ qua: {importResult.skipped} khách hàng (trùng mã hoặc thiếu dữ liệu)
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/customers')}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Xem danh sách khách hàng
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
