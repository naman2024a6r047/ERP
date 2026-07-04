import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { CLASSES, SECTIONS, SUBJECTS } from '../../constants/roles';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';

const DAYS    = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = [
  { num: 1, time: '8:00 – 9:00' },  { num: 2, time: '9:00 – 10:00' },
  { num: 3, time: '10:00 – 11:00' },{ num: 4, time: '11:00 – 12:00' },
  { num: 5, time: '12:00 – 1:00' }, { num: 6, time: '1:00 – 2:00' },
  { num: 7, time: '2:00 – 3:00' },
];

const subjectColors = {
  Mathematics:     'bg-blue-100 text-blue-700',
  Science:         'bg-green-100 text-green-700',
  English:         'bg-yellow-100 text-yellow-700',
  Hindi:           'bg-pink-100 text-pink-700',
  'Social Studies':'bg-purple-100 text-purple-700',
  Computer:        'bg-orange-100 text-orange-700',
  Art:             'bg-teal-100 text-teal-700',
  Free:            'bg-gray-100 text-gray-400',
};

export default function Timetable() {
  const [cls, setCls]           = useState(CLASSES.includes('8th') ? '8th' : CLASSES[0]);
  const [section, setSection]   = useState('A');
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading]   = useState(false);

  // Slot editing state
  const [teachers, setTeachers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [modalForm, setModalForm] = useState({
    id: null,
    day: '',
    period_number: 1,
    subject: '',
    teacher_id: '',
  });

  // Fetch active teachers on mount
  useEffect(() => {
    API.get('/teachers?status=active')
      .then(r => setTeachers(r.data || []))
      .catch(err => console.error('Failed to fetch teachers', err));
  }, []);

  const loadTimetable = () => {
    setLoading(true);
    API.get(`/timetable?class=${cls}&section=${section}`)
      .then(r => setTimetable(r.data || []))
      .catch(() => toast.error('Failed to load timetable'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTimetable();
  }, [cls, section]);

  // Build grid: day → period → slot
  const grid = {};
  DAYS.forEach(d => { grid[d] = {}; });
  timetable.forEach(slot => {
    if (slot.day && grid[slot.day]) {
      grid[slot.day][slot.period_number] = slot;
    }
  });

  const handleCellClick = (day, periodNum) => {
    const existing = grid[day][periodNum];
    if (existing) {
      setSelectedSlot(existing);
      setModalForm({
        id: existing.id,
        day: day,
        period_number: periodNum,
        subject: existing.subject || '',
        teacher_id: existing.teacher_id || '',
      });
    } else {
      setSelectedSlot(null);
      setModalForm({
        id: null,
        day: day,
        period_number: periodNum,
        subject: '',
        teacher_id: '',
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!modalForm.subject || !modalForm.teacher_id) {
      toast.error('Subject and Teacher are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        class: cls,
        section: section,
        day: modalForm.day,
        period_number: modalForm.period_number,
        subject: modalForm.subject,
        teacher_id: parseInt(modalForm.teacher_id, 10),
      };

      if (modalForm.id) {
        await API.put(`/timetable/${modalForm.id}`, payload);
        toast.success('Timetable slot updated!');
      } else {
        await API.post('/timetable', payload);
        toast.success('Timetable slot created!');
      }
      setShowModal(false);
      loadTimetable();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save slot.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!modalForm.id) return;
    if (!window.confirm('Are you sure you want to clear this slot?')) return;

    setSaving(true);
    try {
      await API.delete(`/timetable/${modalForm.id}`);
      toast.success('Slot cleared!');
      setShowModal(false);
      loadTimetable();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear slot.');
    } finally {
      setSaving(false);
    }
  };

  const f = 'border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500';

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <select value={cls} onChange={e => setCls(e.target.value)} className={f}>
          {CLASSES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={section} onChange={e => setSection(e.target.value)} className={f}>
          {SECTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <button onClick={() => toast.success('Print feature coming soon')}
          className="ml-auto border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50">
          🖨️ Print
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Timetable — {cls} Section {section}</h3>
        </div>
        <div className="overflow-x-auto p-4">
          {loading ? (
            <p className="text-center text-gray-400 py-8">Loading...</p>
          ) : (
            <table className="w-full border-collapse text-xs" style={{ minWidth: 650 }}>
              <thead>
                <tr>
                  <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-600 w-24">Day</th>
                  {PERIODS.map(p => (
                    <th key={p.num} className="border border-gray-200 bg-gray-50 px-2 py-2 text-center font-semibold text-gray-600">
                      <div className="font-semibold">P{p.num}</div>
                      <div className="text-[10px] text-gray-400 font-normal">{p.time}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => (
                  <tr key={day}>
                    <td className="border border-gray-200 px-3 py-2 font-semibold text-gray-700 bg-gray-50/50">{day}</td>
                    {PERIODS.map(p => {
                      const slot = grid[day][p.num];
                      const subj = slot?.subject || (day === 'Saturday' && p.num > 3 ? 'Free' : null);
                      const colorClass = subjectColors[subj] || 'bg-gray-50 text-gray-300';
                      return (
                        <td
                          key={p.num}
                          onClick={() => handleCellClick(day, p.num)}
                          className="border border-gray-200 px-2 py-2 text-center hover:bg-blue-50/50 cursor-pointer transition-all relative group"
                        >
                          {subj ? (
                            <div className={`${colorClass} rounded-md px-1.5 py-1.5 font-medium text-[11px]`}>
                              <div>{subj}</div>
                              {slot?.teacher && (
                                <div className="text-[10px] opacity-70 mt-0.5">
                                  {slot.teacher.name ? slot.teacher.name.split(' ').slice(-1)[0] : ''}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-200 group-hover:text-blue-500 font-bold text-sm transition-colors">+</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* Legend */}
        <div className="px-5 pb-4 flex flex-wrap gap-2">
          {Object.entries(subjectColors).slice(0, 7).map(([subj, cls]) => (
            <span key={subj} className={`text-[11px] px-2 py-0.5 rounded ${cls}`}>{subj}</span>
          ))}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedSlot ? 'Edit Timetable Slot' : 'Add Timetable Slot'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 mb-2">
            <div>
              <span className="font-semibold text-gray-400">Class & Section:</span>
              <p className="font-extrabold text-gray-700 mt-0.5">{cls} - {section}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-400">Schedule:</span>
              <p className="font-extrabold text-gray-700 mt-0.5">{modalForm.day}, Period {modalForm.period_number}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Subject *</label>
            <select
              value={modalForm.subject}
              onChange={e => setModalForm(p => ({ ...p, subject: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-white"
              required
            >
              <option value="">Select Subject</option>
              {SUBJECTS.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Teacher *</label>
            <select
              value={modalForm.teacher_id}
              onChange={e => setModalForm(p => ({ ...p, teacher_id: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-white"
              required
            >
              <option value="">Select Teacher</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2.5 pt-2">
            {selectedSlot && (
              <button
                type="button"
                onClick={handleClear}
                disabled={saving}
                className="rounded-xl border border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600 px-4 py-2.5 text-xs font-bold transition-all disabled:opacity-60"
              >
                Clear Slot
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="ml-auto rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-blue-600/15 transition-all disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Slot'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}