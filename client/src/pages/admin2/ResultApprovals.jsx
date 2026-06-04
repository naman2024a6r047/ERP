import { useState, useEffect } from 'react';
import API from '../../utils/api';
import Modal from '../../components/common/Modal';
import { getGradeBg } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function ResultApprovals() {
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [note, setNote]         = useState('');
  const [acting, setActing]     = useState(false);

  const load = () => {
    setLoading(true);
    API.get('/results/pending-approval')
      .then(r => setResults(r.data || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (id, action) => {
    setActing(true);
    try {
      await API.put(`/results/${id}/admin2-review`, { action, notes: note });
      toast.success(action === 'approve' ? 'Forwarded to Admin for final approval!' : 'Result rejected.');
      setModal(null);
      setNote('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed.');
    } finally { setActing(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-800">Result Approvals</h2>
        <p className="text-gray-400 text-sm mt-0.5">
          Review results approved by class incharge and forward to Admin
        </p>
      </div>

      {/* Workflow legend */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
        <p className="font-semibold mb-1">Approval Workflow:</p>
        <p>Teacher → Class Incharge → <strong>Admin2 (You)</strong> → Admin → Published</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-center py-10 text-gray-400 text-sm">Loading...</p>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-gray-500 font-medium">No pending approvals</p>
            <p className="text-gray-400 text-sm mt-1">All results have been reviewed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 560 }}>
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Student', 'Exam', 'Marks', 'Grade', 'Entered By', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-800">{r.student?.first_name} {r.student?.last_name}</p>
                      <p className="text-xs text-gray-400">{r.class} - {r.section}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-gray-700">{r.exam_name}</p>
                      <p className="text-xs text-gray-400">{r.exam_type}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold">{r.total_obtained}/{r.total_marks}</p>
                      <p className="text-xs text-gray-400">{r.percentage}%</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${getGradeBg(r.grade)}`}>{r.grade}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{r.enteredByUser?.name || '—'}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => { setModal(r); setNote(''); }}
                        className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 font-medium">
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review modal */}
      <Modal isOpen={!!modal} onClose={() => setModal(null)} title="Review Result">
        {modal && (
          <div className="space-y-4">
            {/* Result summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Student</span><span className="font-medium">{modal.student?.first_name} {modal.student?.last_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Class</span><span>{modal.class} - {modal.section}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Exam</span><span>{modal.exam_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Score</span><span className="font-semibold">{modal.total_obtained}/{modal.total_marks} ({modal.percentage}%)</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Grade</span><span className={`font-bold px-2 py-0.5 rounded text-xs ${getGradeBg(modal.grade)}`}>{modal.grade}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Entered By</span><span>{modal.enteredByUser?.name}</span></div>
            </div>

            {/* Subject breakdown */}
            {modal.subjects?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50"><tr>
                    {['Subject','Max','Obtained','Grade'].map(h=><th key={h} className="text-left py-2 px-3 text-gray-500 font-semibold uppercase">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {modal.subjects.map((s,i)=>(
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2 px-3">{s.subject}</td>
                        <td className="py-2 px-3">{s.max_marks}</td>
                        <td className="py-2 px-3 font-semibold">{s.obtained_marks}</td>
                        <td className="py-2 px-3"><span className={`font-bold px-1.5 py-0.5 rounded ${getGradeBg(s.grade)}`}>{s.grade}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Notes (optional)</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="Add approval or rejection notes..." />
            </div>

            <div className="flex gap-2">
              <button onClick={() => handleAction(modal.id, 'approve')} disabled={acting}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                {acting ? '...' : '✓ Approve & Forward to Admin'}
              </button>
              <button onClick={() => handleAction(modal.id, 'reject')} disabled={acting}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                {acting ? '...' : '✗ Reject'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}