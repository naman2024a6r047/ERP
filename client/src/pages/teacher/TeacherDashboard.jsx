import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../components/common/StatCard';

export default function TeacherDashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const teacher    = user?.linkedTeacher;

  const todayClasses = [
    { period: '1st — 8:00', class: 'Class 8A', subject: 'Mathematics', students: 42 },
    { period: '3rd — 10:00', class: 'Class 9B', subject: 'Mathematics', students: 38 },
    { period: '5th — 12:00', class: 'Class 10A', subject: 'Mathematics', students: 35 },
  ];

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">
          Welcome, {teacher?.name || user?.name}
        </h2>
        <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
          {teacher?.subject || 'Teacher'} · {teacher?.assigned_classes || 'Classes assigned'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="My Classes"      value="3"    sub="Sections" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>} />
        <StatCard label="Students"        value="115"  sub="Total"    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>} />
        <StatCard label="Avg Attendance"  value="87%"  sub="This week" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>} color="text-green-600" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/teacher/attendance')}
          className="flex items-center gap-3 p-4 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl transition-colors text-left"
        >
          <span className="flex-shrink-0 text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </span>
          <div>
            <p className="font-semibold text-sm">Mark Attendance</p>
            <p className="text-xs text-blue-200 mt-0.5">Record today's attendance</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/teacher/marks')}
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 rounded-xl transition-colors text-left"
        >
          <span className="flex-shrink-0 text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          </span>
          <div>
            <p className="font-semibold text-sm text-gray-800">Enter Marks</p>
            <p className="text-xs text-gray-400 mt-0.5">Submit exam results</p>
          </div>
        </button>
      </div>

      {/* Today's schedule */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Today's Schedule</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {todayClasses.map((cls, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  P{i + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{cls.class} — {cls.subject}</p>
                  <p className="text-xs text-gray-400">{cls.period}</p>
                </div>
              </div>
              <span className="text-xs text-gray-400 sm:text-right self-start sm:self-auto">
                {cls.students} students
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}