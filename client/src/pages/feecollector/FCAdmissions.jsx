import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const statusColor = {
  pending:      'bg-yellow-100 text-yellow-700',
  under_review: 'bg-blue-100 text-blue-700',
  approved:     'bg-green-100 text-green-700',
  rejected:     'bg-red-100 text-red-700',
};

export default function FCAdmissions() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');

  const load = () => {
    setLoading(true);
    const q = filter ? `?status=${filter}` : '';
    API.get(`/fc/admission-requests${q}`)
      .then(r => setRequests(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const handleAction = async (id, status) => {
    const notes = status === 'rejected'
      ? prompt('Reason for rejection:')
      : 'Approved by admin.';
    if (status === 'rejected' && !notes) return;
    try {
      await API.put(`/fc/admission-requests/${id}`, { status, review_notes: notes });
      toast.success(`Request ${status}!`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Admission Requests</h2>
          <p className="text-gray-400 text-sm">{requests.length} total requests</p>
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white w-full sm:w-auto">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-center py-10 text-gray-400 text-sm">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="text-center py-10 text-gray-400 text-sm">No admission requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 600 }}>
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Student', 'Class', 'Parent', 'Phone', 'Submitted', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium whitespace-nowrap">{r.first_name} {r.last_name}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{r.applying_class}</td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{r.parent_name}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{r.parent_phone}</td>
                    <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">{formatDate(r.created_at || r.createdAt)}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[r.status]}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {r.status === 'pending' && (user?.role === 'admin' || user?.role === 'admin2') && (
                        <div className="flex gap-2">
                          <button onClick={() => handleAction(r.id, 'approved')}
                            className="text-xs bg-green-500 text-white px-2.5 py-1 rounded-lg hover:bg-green-600">
                            Approve
                          </button>
                          <button onClick={() => handleAction(r.id, 'rejected')}
                            className="text-xs bg-red-500 text-white px-2.5 py-1 rounded-lg hover:bg-red-600">
                            Reject
                          </button>
                        </div>
                      )}
                      {r.status === 'approved' && (
                        <span className="text-xs text-green-600 font-medium">✓ Student Created</span>
                      )}
                      {(r.status === 'rejected') && (
                        <span className="text-xs text-red-500" title={r.review_notes}>Rejected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}