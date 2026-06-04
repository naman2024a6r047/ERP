import { useEffect, useState } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';

const badge = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function StudentApprovals() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  const load = () => {
    setLoading(true);
    API.get(`/students/approvals?status=${filter}`)
      .then((res) => setStudents(res.data || []))
      .catch(() => toast.error('Failed to load student approvals.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const decide = async (id, status) => {
    const rejection_reason = status === 'rejected' ? prompt('Reason for rejection:') : '';
    if (status === 'rejected' && !rejection_reason) return;
    try {
      await API.put(`/students/${id}/approval`, { status, rejection_reason });
      toast.success(`Student ${status}.`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Student Approvals</h2>
          <p className="text-sm text-gray-400">Review students created by fee collectors.</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="py-10 text-center text-sm text-gray-400">Loading...</p>
        ) : students.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">No {filter} students.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 720 }}>
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Student', 'Class', 'Parent', 'Created By', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-800">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-gray-400 font-mono">{s.student_id}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600">{s.class} - {s.section}</td>
                    <td className="py-3 px-4 text-xs text-gray-600">{s.parent_name}<br />{s.parent_phone}</td>
                    <td className="py-3 px-4 text-xs text-gray-500">{s.creator?.name || 'System'}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge[s.approval_status] || badge.pending}`}>
                        {s.approval_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {s.approval_status === 'pending' ? (
                        <div className="flex gap-2">
                          <button onClick={() => decide(s.id, 'approved')} className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg">Approve</button>
                          <button onClick={() => decide(s.id, 'rejected')} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg">Reject</button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No action</span>
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
