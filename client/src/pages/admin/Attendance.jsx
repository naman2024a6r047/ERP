import { useState, useEffect } from 'react';
import API from '../../utils/api';
import AttendanceForm from '../../components/forms/AttendanceForm';
import { CLASSES, SECTIONS } from '../../constants/roles';
import { todayInput } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function Attendance() {
  const [cls, setCls]           = useState('Class 8');
  const [section, setSection]   = useState('A');
  const [date, setDate]         = useState(todayInput());
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    setLoading(true);
    API.get(`/students?class=${cls}&section=${section}`)
      .then(r => {
        const list = r.data.students || [];
        setStudents(list);
        const init = {};
        list.forEach(s => { init[s.id] = 'present'; });
        setAttendance(init);
      })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  }, [cls, section]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = Object.entries(attendance).map(([student_id, status]) => ({
        student_id: parseInt(student_id), status
      }));
      await API.post('/attendance/bulk', { class: cls, section, date, records });
      toast.success('Attendance saved!');
    } catch {
      toast.error('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const f = 'border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-white w-full';

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Class</label>
            <select value={cls} onChange={e => setCls(e.target.value)} className={f}>
              {CLASSES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Section</label>
            <select value={section} onChange={e => setSection(e.target.value)} className={f}>
              {SECTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <input
              type="date"
              value={date}
              max={todayInput()}
              onChange={e => setDate(e.target.value)}
              className={f}
            />
          </div>
        </div>

        {/* Summary pills */}
        {students.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              { label: 'Total',   val: students.length,                                               color: 'bg-gray-100 text-gray-600' },
              { label: 'Present', val: Object.values(attendance).filter(v => v === 'present').length, color: 'bg-green-100 text-green-700' },
              { label: 'Absent',  val: Object.values(attendance).filter(v => v === 'absent').length,  color: 'bg-red-100 text-red-700' },
              { label: 'Late',    val: Object.values(attendance).filter(v => v === 'late').length,    color: 'bg-yellow-100 text-yellow-700' },
            ].map(item => (
              <span key={item.label} className={`${item.color} rounded-lg px-3 py-1 text-xs font-medium`}>
                {item.val} {item.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Attendance form */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          {cls} — Section {section} &nbsp;·&nbsp;
          <span className="text-gray-400 font-normal text-xs">
            {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' })}
          </span>
        </h3>
        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Loading students...</p>
        ) : students.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">No students found.</p>
        ) : (
          <AttendanceForm
            students={students}
            attendance={attendance}
            onChange={setAttendance}
            onSave={handleSave}
            loading={saving}
          />
        )}
      </div>
    </div>
  );
}