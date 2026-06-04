import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { CLASSES, SECTIONS } from '../../constants/roles';
import toast from 'react-hot-toast';

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
  const [cls, setCls]           = useState('Class 8');
  const [section, setSection]   = useState('A');
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    setLoading(true);
    API.get(`/timetable?class=${cls}&section=${section}`)
      .then(r => setTimetable(r.data || []))
      .catch(() => toast.error('Failed to load timetable'))
      .finally(() => setLoading(false));
  }, [cls, section]);

  // Build grid: day → period → slot
  const grid = {};
  DAYS.forEach(d => { grid[d] = {}; });
  timetable.forEach(slot => { grid[slot.day][slot.period_number] = slot; });

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
                        <td key={p.num} className="border border-gray-200 px-2 py-2 text-center">
                          {subj ? (
                            <div className={`${colorClass} rounded-md px-1.5 py-1.5 font-medium text-[11px]`}>
                              <div>{subj}</div>
                              {slot?.teacher && <div className="text-[10px] opacity-70 mt-0.5">{slot.teacher.name?.split(' ').slice(-1)[0]}</div>}
                            </div>
                          ) : (
                            <span className="text-gray-200">—</span>
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
    </div>
  );
}