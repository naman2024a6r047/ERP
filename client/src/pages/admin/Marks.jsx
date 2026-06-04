import { useState, useEffect } from 'react';
import API from '../../utils/api';
import Modal from '../../components/common/Modal';
import MarksForm from '../../components/forms/MarksForm';
import { getGradeBg, formatDate } from '../../utils/helpers';
import { CLASSES, SECTIONS } from '../../constants/roles';
import toast from 'react-hot-toast';

export default function Marks() {
  const [cls, setCls]           = useState('Class 8');
  const [section, setSection]   = useState('A');
  const [students, setStudents] = useState([]);
  const [results, setResults]   = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    API.get(`/students?class=${cls}&section=${section}`)
      .then(r => setStudents(r.data.students || []))
      .catch(() => toast.error('Failed to load students'));
    API.get(`/results/class?class=${cls}&section=${section}`)
      .then(r => setResults(r.data || []))
      .catch(() => {});
  }, [cls, section]);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      const subjectData = data.subjects[0];
      for (const entry of subjectData.entries) {
        await API.post('/results', {
          student_id: entry.student_id,
          exam_name:  data.exam_name,
          exam_type:  data.exam_type,
          class: cls, section,
          subjects: [{
            subject:         subjectData.subject,
            max_marks:       subjectData.max_marks,
            obtained_marks:  entry.obtained_marks,
          }]
        });
      }
      toast.success('Marks saved successfully!');
      setShowModal(false);
      API.get(`/results/class?class=${cls}&section=${section}`).then(r => setResults(r.data || []));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save marks.');
    } finally {
      setSaving(false);
    }
  };

  const f = 'border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <select value={cls} onChange={e => setCls(e.target.value)} className={f}>
          {CLASSES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={section} onChange={e => setSection(e.target.value)} className={f}>
          {SECTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <button onClick={() => setShowModal(true)}
          className="ml-auto bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Enter Marks
        </button>
      </div>

      {/* Results table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Results — {cls} {section}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Student', 'Exam', 'Total Marks', 'Obtained', '%', 'Grade', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-gray-400 py-10">No results entered yet.</td></tr>
              ) : results.map(r => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{r.student?.first_name} {r.student?.last_name}</td>
                  <td className="py-3 px-4 text-gray-600">{r.exam_name}</td>
                  <td className="py-3 px-4 text-gray-500">{r.total_marks}</td>
                  <td className="py-3 px-4 font-semibold">{r.total_obtained}</td>
                  <td className="py-3 px-4">{r.percentage}%</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${getGradeBg(r.grade)}`}>{r.grade}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {r.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-400">{formatDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Enter Marks — ${cls} ${section}`}>
        <MarksForm students={students} onSubmit={handleSave} loading={saving} />
      </Modal>
    </div>
  );
}