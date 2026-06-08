import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../utils/api';
import { formatCurrency, feeStatusColor, formatDate } from '../../utils/helpers';
import { generateFeeReceipt } from '../../utils/pdfGenerator';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useSettings } from '../../context/SettingsContext';

export default function FeeStatus() {
  const { user } = useAuth();
  const { settings } = useSettings() || {};
  const studentId = user?.linkedStudent?.id;
  const [fees, setFees]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    API.get(`/fees/student/${studentId}`)
      .then(r => setFees(r.data || []))
      .catch(() => toast.error('Failed to load fees'))
      .finally(() => setLoading(false));
  }, [studentId]);

  const totalPaid    = fees.reduce((a, f) => a + parseFloat(f.paid_amount  || 0), 0);
  const totalAmount  = fees.reduce((a, f) => a + parseFloat(f.total_amount || 0), 0);
  const totalPending = totalAmount - totalPaid;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Annual Fee', val: formatCurrency(totalAmount),  color: 'text-gray-800' },
          { label: 'Paid',       val: formatCurrency(totalPaid),    color: 'text-green-600' },
          { label: 'Pending',    val: formatCurrency(totalPending), color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 text-center">
            <p className="text-[11px] text-gray-400 mb-1">{s.label}</p>
            <p className={`text-sm sm:text-base font-bold ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Fee records */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Fee History</h3>
        </div>
        {fees.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-sm">No fee records found.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {fees.map(fee => (
              <div key={fee.id} className="px-4 sm:px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5
                      ${fee.status === 'paid' ? 'bg-green-500' : fee.status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'}`}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 text-sm">{fee.month}</p>
                      <div className="flex flex-wrap gap-3 mt-1">
                        <span className="text-xs text-gray-400">
                          Total: <span className="text-gray-600">{formatCurrency(fee.total_amount)}</span>
                        </span>
                        <span className="text-xs text-green-600">
                          Paid: {formatCurrency(fee.paid_amount)}
                        </span>
                        {fee.status !== 'paid' && (
                          <span className="text-xs text-red-500">
                            Due: {formatCurrency(fee.total_amount - fee.paid_amount)}
                          </span>
                        )}
                      </div>
                      {fee.paid_date && (
                        <p className="text-[11px] text-gray-400 mt-1">
                          {formatDate(fee.paid_date)} · {fee.payment_mode || '—'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${feeStatusColor[fee.status]}`}>
                      {fee.status}
                    </span>
                    {fee.status === 'paid' && fee.receipt_number && (
                      <button
                        onClick={() => generateFeeReceipt(fee, user?.linkedStudent, settings)}
                        className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                      >
                         Receipt
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}