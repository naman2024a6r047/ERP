import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../hooks/useAttendance';
import { attendanceBg } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export default function MyAttendance() {
  const { user } = useAuth();
  const studentId = user?.linkedStudent?.id;
  const now       = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year]            = useState(now.getFullYear());
  const { records, stats, loading, fetchStudentAttendance } = useAttendance();

  useEffect(() => {
    if (studentId) fetchStudentAttendance(studentId, month, year);
  }, [studentId, month, year]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay    = new Date(year, month - 1, 1).getDay();
  const recordMap   = {};
  records.forEach(r => { recordMap[new Date(r.date).getDate()] = r.status; });

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="space-y-4 max-w-lg">
      {/* Month selector */}
      <select
        value={month}
        onChange={e => setMonth(Number(e.target.value))}
        className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-white w-full sm:w-auto"
      >
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>{m} {year}</option>
        ))}
      </select>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: 'Present',  val: stats.present    || 0, color: 'text-green-600' },
            { label: 'Absent',   val: stats.absent     || 0, color: 'text-red-500' },
            { label: 'Days',     val: stats.total      || 0, color: 'text-gray-700' },
            {
              label: '%',
              val: `${stats.percentage || 0}%`,
              color: (stats.percentage || 0) >= 85 ? 'text-green-600'
                   : (stats.percentage || 0) >= 75 ? 'text-yellow-600'
                   : 'text-red-500',
            },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className="text-[10px] text-gray-400 mb-1">{s.label}</p>
              <p className={`text-base sm:text-lg font-bold ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {MONTHS[month - 1]} {year}
        </h3>
        {loading ? <LoadingSpinner /> : (
          <>
            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {dayLabels.map((d, i) => (
                <div key={i} className="text-[11px] font-semibold text-gray-400 text-center py-1">{d}</div>
              ))}
            </div>

            {/* Date grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const status  = recordMap[day];
                const isToday = day === now.getDate() && month === now.getMonth() + 1;
                return (
                  <div
                    key={day}
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg text-[11px] sm:text-xs font-medium
                      ${status ? attendanceBg[status] : 'bg-gray-50 text-gray-300'}
                      ${isToday ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
                  >
                    <span>{day}</span>
                    {status && (
                      <span className="text-[8px] sm:text-[9px] mt-0.5 uppercase">
                        {status[0]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4">
              {[['present', 'Present'], ['absent', 'Absent'], ['late', 'Late'], ['holiday', 'Holiday']].map(([s, l]) => (
                <span key={s} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className={`w-3 h-3 rounded-sm ${attendanceBg[s].split(' ')[0]}`} />
                  {l}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}