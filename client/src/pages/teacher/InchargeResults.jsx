import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../utils/roleUtils';

export default function InchargeResults() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [examName, setExamName] = useState('');
  const [payload, setPayload] = useState({ incharge: null, exams: [], results: [] });

  const loadResults = async (selectedExam = '') => {
    if (!can(user, 'INCHARGE_REVIEW')) return;

    setLoading(true);
    try {
      const query = selectedExam ? `?exam_name=${encodeURIComponent(selectedExam)}` : '';
      const response = await API.get(`/results/class-incharge${query}`);
      setPayload(response.data || { incharge: null, exams: [], results: [] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load class results.');
      setPayload({ incharge: null, exams: [], results: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults(examName);
  }, [examName]);

  const groupedRows = useMemo(() => {
    const rows = new Map();

    for (const result of payload.results || []) {
      const key = result.student_id;
      if (!rows.has(key)) {
        rows.set(key, {
          studentId: result.student?.student_id || result.student_id,
          rollNumber: result.student?.roll_number || '—',
          studentName: `${result.student?.first_name || ''} ${result.student?.last_name || ''}`.trim(),
          exams: {},
        });
      }

      const entry = rows.get(key);
      const examKey = result.exam_name || 'Exam';
      if (!entry.exams[examKey]) entry.exams[examKey] = [];

      for (const subject of result.subjects || []) {
        entry.exams[examKey].push({
          subject: subject.subject,
          marks: `${subject.obtained_marks}/${subject.max_marks}`,
          grade: subject.grade,
          enteredBy: result.enteredByUser?.name || '—',
        });
      }
    }

    return Array.from(rows.values());
  }, [payload.results]);

  if (!can(user, 'INCHARGE_REVIEW')) {
    return <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">Access denied.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Class Incharge Results</h2>
            <p className="mt-1 text-sm text-gray-500">
              {payload.incharge
                ? `Viewing all subjects for ${payload.incharge.class} - ${payload.incharge.section}`
                : 'View all subjects for your assigned class.'}
            </p>
          </div>
          <div className="w-full sm:w-64">
            <label className="mb-1 block text-xs font-medium text-gray-500">Filter by Exam</label>
            <select
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="">All Exams</option>
              {(payload.exams || []).map((exam) => (
                <option key={exam} value={exam}>
                  {exam}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading results...</div>
        ) : groupedRows.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No results found for this class.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Roll No.</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Exam</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Marks</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Entered By</th>
                </tr>
              </thead>
              <tbody>
                {groupedRows.flatMap((row) =>
                  Object.entries(row.exams).flatMap(([exam, subjects], examIndex) =>
                    subjects.map((subject, subjectIndex) => (
                      <tr key={`${row.studentId}-${exam}-${subject.subject}-${subjectIndex}`} className="border-t border-gray-100">
                        <td className="px-4 py-3 text-gray-600">{subjectIndex === 0 && examIndex === 0 ? row.rollNumber : ''}</td>
                        <td className="px-4 py-3">
                          {subjectIndex === 0 && examIndex === 0 ? (
                            <div>
                              <p className="font-medium text-gray-800">{row.studentName}</p>
                              <p className="text-xs text-gray-400">{row.studentId}</p>
                            </div>
                          ) : (
                            ''
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{subjectIndex === 0 ? exam : ''}</td>
                        <td className="px-4 py-3 text-gray-700">{subject.subject}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{subject.marks}</td>
                        <td className="px-4 py-3">{subject.grade}</td>
                        <td className="px-4 py-3 text-gray-500">{subject.enteredBy}</td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
