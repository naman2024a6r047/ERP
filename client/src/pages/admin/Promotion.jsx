import { useState, useEffect } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';

const PROMOTION_MAP = {
  'day care':  'Playgroup',
  'Playgroup': 'Nursery',
  'Nursery':   'LKG',
  'LKG':       'UKG',
  'UKG':       '1st',
  '1st':       '2nd',
  '2nd':       '3rd',
  '3rd':       '4th',
  '4th':       '5th',
  '5th':       '6th',
  '6th':       '7th',
  '7th':       '8th',
  '8th':       '9th',
  '9th':       '10th',
  '10th':      'Alumni / Passed Out',
};

export default function Promotion() {
  const [sessions, setSessions]     = useState([]);
  const [newSession, setNewSession] = useState('');
  const [creating, setCreating]     = useState(false);
  const [promoting, setPromoting]   = useState(false);

  const loadSessions = () =>
    API.get('/session').then(r => setSessions(r.data)).catch(() => toast.error('Failed'));

  useEffect(() => { loadSessions(); }, []);

  const activeSession   = sessions.find(s => s.is_active);
  const upcomingSession = sessions.find(s => !s.is_active && !s.is_archived);

  const createSession = async () => {
    if (!newSession.trim()) return toast.error('Enter session name');
    setCreating(true);
    try {
      await API.post('/session', { name: newSession.trim() });
      toast.success('Session created!');
      setNewSession('');
      loadSessions();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setCreating(false); }
  };

  const activateSession = async (id) => {
    try {
      await API.put(`/session/${id}/activate`);
      toast.success('Session activated!');
      loadSessions();
    } catch { toast.error('Failed.'); }
  };

  const bulkPromote = async () => {
    if (!upcomingSession) return toast.error('Create the next session first.');
    if (!window.confirm(`This will promote all students and mark 10th students as Alumni.\n\nPromotion fees will be auto-created.\n\nProceed?`)) return;

    setPromoting(true);
    try {
      const res = await API.post('/session/promote', {
        from_session_id: activeSession.id,
        to_session_id:   upcomingSession.id,
      });
      const summary = res.data.summary?.map(s =>
        `${s.fromClass} → ${s.toClass === 'alumni' ? 'Alumni' : s.toClass}: ${s.count}`
      ).join('\n');
      toast.success('Promotion complete!');
      alert(`Promotion Summary:\n\n${summary}`);
      loadSessions();
    } catch { toast.error('Promotion failed.'); }
    finally { setPromoting(false); }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Sessions */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <h3 className="font-semibold text-gray-700 text-sm mb-4">Academic Sessions</h3>
        <div className="space-y-2 mb-4">
          {sessions.map(s => (
            <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{s.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                  ${s.is_active ? 'bg-green-100 text-green-700'
                  : s.is_archived ? 'bg-gray-100 text-gray-500'
                  : 'bg-blue-100 text-blue-700'}`}>
                  {s.is_active ? 'Active' : s.is_archived ? 'Archived' : 'Upcoming'}
                </span>
                {s.promotion_completed && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                    Promoted ✓
                  </span>
                )}
              </div>
              {!s.is_active && !s.is_archived && (
                <button onClick={() => activateSession(s.id)}
                  className="text-xs text-blue-500 hover:text-blue-700 font-medium">
                  Activate
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={newSession} onChange={e => setNewSession(e.target.value)}
            placeholder="e.g. 2025-2026"
            onKeyDown={e => e.key === 'Enter' && createSession()}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
          <button onClick={createSession} disabled={creating}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-xl">
            {creating ? 'Creating...' : '+ Create'}
          </button>
        </div>
      </div>

      {/* Promotion map */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <h3 className="font-semibold text-gray-700 text-sm mb-1">Bulk Promotion</h3>
        <p className="text-xs text-gray-400 mb-4">Automatically promotes all students and creates promotion fees</p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800 leading-relaxed">
          ⚠️ This will promote all students. 10th students will be marked as <strong>Alumni / Passed Out</strong> (not graduated). Promotion fees will be auto-generated.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
          {Object.entries(PROMOTION_MAP).map(([from, to]) => (
            <div key={from} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 text-sm">
              <span className="font-medium text-gray-700">{from}</span>
              <span className="text-gray-400 mx-2">→</span>
              <span className={`font-semibold ${to.includes('Alumni') ? 'text-orange-600' : 'text-blue-600'}`}>
                {to}
              </span>
            </div>
          ))}
        </div>

        <button onClick={bulkPromote} disabled={promoting || !activeSession || !upcomingSession}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm">
          {promoting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              Promoting...
            </span>
          ) : '🔁 Promote All Classes'}
        </button>

        {!upcomingSession && (
          <p className="text-xs text-gray-400 text-center mt-2">
            Create an upcoming session above first.
          </p>
        )}
      </div>
    </div>
  );
}