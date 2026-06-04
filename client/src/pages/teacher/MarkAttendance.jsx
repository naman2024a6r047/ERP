import { useState, useEffect } from 'react';
import API from '../../utils/api';
import AttendanceForm from '../../components/forms/AttendanceForm';
import { CLASSES, SECTIONS } from '../../constants/roles';
import { todayInput } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function MarkAttendance() {
  const [cls, setCls]           = useState('Class 8');
  const [section, setSection]   = useState('A');
  const [date, setDate]         = useState(todayInput());
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    setLoading(true);
    setSaved(false);
    API.get(`/students?class=${cls}&section=${section}`)
      .then(async r => {
        const list = r.data.students || [];
        setStudents(list);

        // Pre-fill existing attendance for selected date
        try {
          const existing = await API.get(`/attendance/class?class=${cls}&section=${section}&date=${date}`);
          const init = {};
          list.forEach(s => { init[s.id] = 'present'; });
          (existing.data || []).forEach(record => {
            if (record.status !== 'not_marked') init[record.student.id] = record.status;
          });
          setAttendance(init);
        } catch {
          const init = {};
          list.forEach(s => { init[s.id] = 'present'; });
          setAttendance(init);
        }
      })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  }, [cls, section, date]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = Object.entries(attendance).map(([student_id, status]) => ({
        student_id: parseInt(student_id), status
      }));
      await API.post('/attendance/bulk', { class: cls, section, date, records });
      toast.success('Attendance saved!');
      setSaved(true);
    } catch {
      toast.error('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendance).filter(v => v === 'present').length;
  const absentCount  = Object.values(attendance).filter(v => v === 'absent').length;

  const f = 'border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white';

  return (
    <div className="max-w-3xl space-y-5">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex gap-3 flex-wrap items-center">
          <select value={cls} onChange={e => setCls(e.target.value)} className={f}>
            {CLASSES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={section} onChange={e => setSection(e.target.value)} className={f}>
            {SECTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={f} max={todayInput()} />
        </div>

        {/* Summary pills */}
        {students.length > 0 && (
          <div className="flex gap-3 mt-3">
            {[
              { label: 'Total', val: students.length, color: 'bg-gray-100 text-gray-600' },
              { label: 'Present', val: presentCount, color: 'bg-green-100 text-green-700' },
              { label: 'Absent',  val: absentCount,  color: 'bg-red-100 text-red-700' },
              { label: 'Late',    val: Object.values(attendance).filter(v => v === 'late').length, color: 'bg-yellow-100 text-yellow-700' },
            ].map(item => (
              <div key={item.label} className={`${item.color} rounded-lg px-3 py-1.5 text-xs font-medium`}>
                {item.val} {item.label}
              </div>
            ))}
            {saved && <div className="ml-auto bg-green-50 text-green-600 text-xs px-3 py-1.5 rounded-lg font-medium">✓ Saved</div>}
          </div>
        )}
      </div>

      {/* Attendance form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          {cls} — Section {section} &nbsp;·&nbsp;
          <span className="text-gray-400 font-normal">{new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
        </h3>
        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Loading students...</p>
        ) : students.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">No students found for this class.</p>
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