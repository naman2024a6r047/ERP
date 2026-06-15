import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line } from 'recharts';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
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

// Dynamic data will be fetched via API

const quickLinks = [
  { label: 'Study Materials', icon: '', color: 'bg-cyan-50 border-cyan-100 hover:bg-cyan-100/40 text-cyan-600', path: '/parent/profile' },
  { label: 'Online Resources', icon: '', color: 'bg-blue-50 border-blue-100 hover:bg-blue-100/40 text-blue-600', path: '/parent/profile' },
  { label: 'Class Notes', icon: '', color: 'bg-amber-50 border-amber-100 hover:bg-amber-100/40 text-amber-600', path: '/parent/profile' },
  { label: 'Library', icon: '', color: 'bg-purple-50 border-purple-100 hover:bg-purple-100/40 text-purple-600', path: '/parent/profile' },
  { label: 'Ask Doubts', icon: '', color: 'bg-rose-50 border-rose-100 hover:bg-rose-100/40 text-rose-600', path: '/parent/profile' },
  { label: 'Calendar', icon: '', color: 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100/40 text-emerald-600', path: '/parent/attendance' },
];

// Calendar grid will be generated dynamically inside the component

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('May 2025');

  // Timetable integration
  const [timetableData, setTimetableData] = useState([]);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [showTimetableModal, setShowTimetableModal] = useState(false);

  const studentClass = user?.linkedStudent?.class;
  const studentSection = user?.linkedStudent?.section;

  useEffect(() => {
    if (studentClass && studentSection) {
      setLoadingTimetable(true);
      API.get(`/timetable?class=${studentClass}&section=${studentSection}`)
        .then(r => setTimetableData(r.data || []))
        .catch(err => console.error('Failed to load student timetable', err))
        .finally(() => setLoadingTimetable(false));
    }
  }, [studentClass, studentSection]);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = daysOfWeek[new Date().getDay()];

  // Filter and format today's slots
  const todaySlotsRaw = timetableData.filter(s => s.day === todayDayName);
  const periodTimes = {
    1: '08:00 AM', 2: '09:00 AM', 3: '10:00 AM', 4: '11:00 AM',
    5: '12:00 PM', 6: '01:00 PM', 7: '02:00 PM'
  };

  const todaySlots = todaySlotsRaw.map(slot => ({
    time: periodTimes[slot.period_number] || `${slot.period_number} Period`,
    subject: slot.subject,
    teacher: slot.teacher?.name || 'Assigned Teacher',
    room: `Room ${user?.linkedStudent?.roll_number ? 100 + user.linkedStudent.roll_number : 101}`,
    color: subjectColors[slot.subject] || 'bg-slate-100 text-slate-600',
  }));

  const displayTodayTimetable = todaySlots;

  // Build weekly timetable grid day → period → slot
  const fullGrid = {};
  DAYS.forEach(d => { fullGrid[d] = {}; });
  timetableData.forEach(slot => {
    if (slot.day && fullGrid[slot.day]) {
      fullGrid[slot.day][slot.period_number] = slot;
    }
  });

  // Integration states
  const [fees, setFees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [results, setResults] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  useEffect(() => {
    const studentId = user?.linkedStudent?.id;
    if (!studentId) return;

    Promise.all([
      API.get(`/fees/student/${studentId}`).catch(() => ({ data: [] })),
      API.get(`/attendance/student/${studentId}`).catch(() => ({ data: { records: [] } })),
      API.get(`/results/student/${studentId}`).catch(() => ({ data: [] })),
      API.get(`/notifications`).catch(() => ({ data: [] }))
    ]).then(([feesRes, attRes, resRes, notifRes]) => {
      setFees(feesRes.data || []);
      setAttendance(attRes.data?.records || (Array.isArray(attRes.data) ? attRes.data : []));
      setResults(resRes.data || []);
      setNotifications(notifRes.data || []);
      setDashboardLoading(false);
    });
  }, [user?.linkedStudent?.id]);

  const studentName = user?.linkedStudent 
    ? `${user.linkedStudent.first_name || ''} ${user.linkedStudent.last_name || ''}`.trim() 
    : 'Student';

  // Compute Fees
  const totalFeesAmount = fees.reduce((acc, f) => acc + parseFloat(f.total_amount || 0), 0);
  const paidFeesAmount = fees.reduce((acc, f) => acc + parseFloat(f.paid_amount || 0), 0);
  const pendingFeesAmount = totalFeesAmount - paidFeesAmount;
  const feesChartData = [
    { name: 'Paid', value: paidFeesAmount || 1, color: '#22c55e' }, // || 1 prevents recharts error on 0
    { name: 'Pending', value: pendingFeesAmount, color: '#ef4444' }
  ];

  // Compute Attendance
  const totalDays = attendance.length;
  const presentDays = attendance.filter(a => a.status === 'present').length;
  const attendancePercentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;


  const latestResult = results.length > 0 ? results[0] : null;
  const overallGrade = latestResult?.grade || '—';
  const dynamicSparklineData = results.length > 0 
    ? results.slice().reverse().map(r => ({ value: r.percentage || 0 }))
    : [];

  return (
    <div className="space-y-6">
      
      {/* 1. Dynamic Premium Greeting Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-premium">
        
        {/* Abstract Background Vectors */}
        <div className="absolute right-0 top-0 w-80 h-full bg-white/5 rounded-l-full blur-3xl pointer-events-none" />
        <div className="absolute left-10 bottom-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        
        {/* Banner Grid */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative z-10">
          <div>
            <span className="bg-white/10 text-white/90 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">{studentName}</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-3.5 tracking-tight flex items-center gap-2.5">
              Welcome, {studentName}!
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1.5 font-medium">Keep up the great work and stay consistent!</p>
          </div>
          
          {/* Action button redirecting to Profile details */}
          <button
            onClick={() => navigate('/parent/profile')}
            className="flex-shrink-0 flex items-center justify-center gap-2 rounded-xl bg-white text-blue-600 hover:bg-blue-50 text-xs font-bold px-4 py-3 shadow-md active:scale-95 transition-all self-start sm:self-auto"
          >
            View Student Profile
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>

      {/* 2. Stat Cards Grid (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Attendance Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-card flex flex-col justify-between hover:border-slate-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold border border-emerald-100"></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">{attendancePercentage}%</h3>
            <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">Overall</p>
          </div>
          {/* Green Progress Bar */}
          <div className="mt-4 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${attendancePercentage}%` }} />
          </div>
        </div>

        {/* Average Grade Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-card flex flex-col justify-between hover:border-slate-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Grade</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-sm font-bold border border-purple-100"></div>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">{overallGrade}</h3>
              <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">Latest Grade</p>
            </div>
            <div className="w-16 h-10">
              {dynamicSparklineData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dynamicSparklineData}>
                    <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Exams Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-card flex flex-col justify-between hover:border-slate-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upcoming Exams</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold border border-blue-100"></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">0</h3>
            <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">No Upcoming Exams</p>
          </div>
        </div>

        {/* Fees Due Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-card flex flex-col justify-between hover:border-slate-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fees Due</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold border border-amber-100"></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">₹ {pendingFeesAmount.toLocaleString('en-IN')}</h3>
            <p className="text-[10px] font-semibold text-red-500 mt-1 uppercase tracking-wider">Total Pending</p>
          </div>
        </div>

      </div>

      {/* 3. Timetable & Attendance Calendar Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Attendance Summary Calendar Widget (7 cols) */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-card lg:col-span-7 flex flex-col">
          <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div className="flex items-center gap-2.5">
              <span className="text-xl"></span>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">
                  Attendance Summary ({new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()})
                </h3>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mt-0.5">{attendancePercentage}% Present</p>
              </div>
            </div>
            
            {/* Legend Indicators */}
            <div className="flex items-center gap-3.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" /> Present</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 block" /> Absent</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 block" /> Holiday</div>
            </div>
          </div>

          {/* Calendar Grid Header (Mon to Sun) */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-400 uppercase tracking-widest pb-3 mb-2 border-b border-slate-50">
            <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
          </div>

          {/* Calendar Days Matrix */}
          <div className="grid grid-cols-7 gap-2 flex-1 justify-items-center">
            {(() => {
              const todayDate = new Date();
              const currentMonth = todayDate.getMonth();
              const currentYear = todayDate.getFullYear();
              const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
              const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
              const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // 0=Mon, 6=Sun

              const dynamicCalendarDays = [];
              for (let i = 0; i < adjustedFirstDay; i++) {
                dynamicCalendarDays.push({ day: '', status: 'empty' });
              }

              for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                const attRecord = attendance.find(a => a.date && a.date.startsWith(dateStr));
                let status = 'holiday';
                if (attRecord) {
                  status = attRecord.status;
                }
                dynamicCalendarDays.push({ day: i, status });
              }

              while (dynamicCalendarDays.length % 7 !== 0) {
                dynamicCalendarDays.push({ day: '', status: 'empty' });
              }

              return dynamicCalendarDays.map((item, i) => {
              let cellClass = "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs font-bold ";
              let dotClass = "w-1.5 h-1.5 rounded-full absolute bottom-1 ";

              if (item.status === 'empty') {
                cellClass += "text-slate-300 opacity-30 select-none pointer-events-none";
              } else if (item.status === 'present') {
                cellClass += "bg-emerald-50 text-emerald-700 border border-emerald-100/50 hover:bg-emerald-100/60 relative";
                dotClass += "bg-emerald-500";
              } else if (item.status === 'absent') {
                cellClass += "bg-red-50 text-red-700 border border-red-100/50 hover:bg-red-100/60 relative";
                dotClass += "bg-red-500";
              } else if (item.status === 'holiday') {
                cellClass += "bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100 relative";
                dotClass += "bg-slate-400";
              }

              // Special highlight for today's representation (May 15)
              const isToday = item.day === 15 && item.status === 'present';

              return (
                <div 
                  key={i} 
                  className={`${cellClass} ${
                    isToday ? 'ring-2 ring-blue-500 shadow-md shadow-blue-500/10' : ''
                  }`}
                >
                  <span>{item.day}</span>
                  {item.status !== 'empty' && <span className={dotClass} />}
                </div>
              );
            })})()}
          </div>
        </div>

        {/* Today's Timetable Widget (5 cols) */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-card lg:col-span-5 flex flex-col justify-between">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between gap-2.5 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl"></span>
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Today's Timetable</h3>
            </div>
            <button
              onClick={() => setShowTimetableModal(true)}
              className="text-[10px] font-bold text-blue-500 hover:underline uppercase tracking-wider"
            >
              View Full Timetable
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {loadingTimetable ? (
              <p className="text-center text-gray-400 text-xs py-8">Loading...</p>
            ) : displayTodayTimetable.length === 0 ? (
              <p className="text-center text-gray-400 text-xs py-8">No classes scheduled today.</p>
            ) : (
              displayTodayTimetable.map((item, index) => (
                <div key={index} className="flex items-center gap-3.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100/70 p-3 rounded-2xl transition-colors">
                  <div className={`w-8 h-8 rounded-xl ${item.color || 'bg-slate-100'} flex items-center justify-center font-extrabold text-sm flex-shrink-0`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-extrabold text-slate-800 truncate">{item.subject}</p>
                      <span className="text-[9px] bg-slate-200/50 text-slate-500 px-2 py-0.5 rounded font-bold">{item.room || '-'}</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">{item.teacher || '-'}</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 flex-shrink-0">{item.time || `${item.start_time} - ${item.end_time}`}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 4. Upcoming Exams & Notice Board Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Upcoming Exams Card */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-card flex flex-col justify-between">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between gap-2.5 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl"></span>
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Upcoming Exams</h3>
            </div>
            <button className="text-[10px] font-bold text-slate-400 hover:underline uppercase tracking-wider">View All</button>
          </div>

          <div className="space-y-3.5 flex-1">
            <div className="text-center text-xs text-gray-400 mt-4">
              No upcoming exams currently scheduled.
            </div>
          </div>
        </div>

        {/* Notices Board */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-card flex flex-col justify-between">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between gap-2.5 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl"></span>
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Notice Board</h3>
            </div>
            <button className="text-[10px] font-bold text-slate-400 hover:underline uppercase tracking-wider">View All</button>
          </div>

          <div className="space-y-3.5 flex-1">
            {notifications.length === 0 ? (
              <div className="text-center text-xs text-gray-400 mt-4">
                No recent notices.
              </div>
            ) : (
              notifications.slice(0, 3).map((item, i) => (
                <div key={i} className="flex gap-3 px-1 py-1 hover:bg-slate-50/50 rounded-xl transition-colors">
                  <div className={`w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-lg font-bold flex-shrink-0 mt-0.5`}>
                    
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-extrabold text-slate-800 truncate">{item.title}</h4>
                      <span className="text-[9px] font-bold text-slate-400 flex-shrink-0">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 mt-1 leading-normal">{item.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 5. Results & Fees Overview Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Results Card (7 cols) */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-card lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-slate-100 flex items-center justify-between gap-2.5 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl"></span>
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Academic Results (Term 1)</h3>
              </div>
              <button className="text-[10px] font-bold text-slate-400 hover:underline uppercase tracking-wider">View Full Report</button>
            </div>

            {/* Results Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[9px] tracking-wider">
                    <th className="py-2.5 font-bold">Subject</th>
                    <th className="py-2.5 font-bold text-center">Marks</th>
                    <th className="py-2.5 font-bold text-right">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                  {!latestResult ? (
                    <tr>
                      <td colSpan="3" className="py-4 text-center text-xs text-gray-400">No results published</td>
                    </tr>
                  ) : (
                    (latestResult.subjects || []).map((row, i) => (
                      <tr key={i} className={`hover:bg-slate-50/50 ${i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                        <td className="py-2.5 font-extrabold">{row.subject}</td>
                        <td className="py-2.5 text-center">{row.obtained_marks} / {row.max_marks}</td>
                        <td className={`py-2.5 text-right font-black ${
                          row.grade === 'A+' ? 'text-emerald-500' : 'text-blue-500'
                        }`}>{row.grade}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Results Summary footer */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 p-3 rounded-2xl">
            <div className="text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Average Percentage</span>
              <p className="text-sm font-extrabold text-slate-700 mt-1 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> {latestResult ? latestResult.percentage : 0}%
              </p>
            </div>
            <div className="text-right text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Overall Grade</span>
              <p className="text-sm font-black text-emerald-600 mt-1">{overallGrade}</p>
            </div>
          </div>
        </div>

        {/* Fees Overview Donut Card (5 cols) */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-card lg:col-span-5 flex flex-col justify-between">
          <div className="pb-4 border-b border-slate-100 flex items-center gap-2.5 mb-3">
            <span className="text-xl"></span>
            <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Fees Overview</h3>
          </div>

          {/* Recharts Pie Chart Donut */}
          <div className="h-44 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={feesChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {feesChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Absolute Centered details */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Total Fees</p>
              <p className="text-base font-extrabold text-slate-800 mt-1.5">₹ {totalFeesAmount.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Status Breakdown list */}
          <div className="grid grid-cols-2 gap-3.5 pb-4 border-b border-slate-50 text-xs">
            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Paid</p>
                <p className="font-extrabold text-slate-700 mt-0.5">₹ {paidFeesAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pending</p>
                <p className="font-extrabold text-red-500 mt-0.5">₹ {pendingFeesAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => navigate('/parent/fees')}
            className="w-full mt-3.5 flex items-center justify-center gap-2 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-100/70 py-2.5 text-xs font-bold text-slate-700 transition-colors"
          >
            View Details & Receipts
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

      </div>

      {/* 6. Quick Links Section */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-card">
        <div className="pb-4 border-b border-slate-100 flex items-center gap-2.5 mb-5">
          <span className="text-xl"></span>
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Quick Links</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {quickLinks.map((link, i) => (
            <button
              key={i}
              onClick={() => navigate(link.path)}
              className={`flex flex-col items-center justify-center p-4 border rounded-2xl ${link.color} transition-all active:scale-95 text-center gap-2`}
            >
              <span className="text-2xl">{link.icon}</span>
              <span className="font-bold text-xs text-slate-700">{link.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 7. Achievements Card (Image 3 Showcase) */}
      <div className="bg-gradient-to-br from-[#101735] to-[#0a0e28] rounded-3xl border border-white/5 p-6 sm:p-8 shadow-card flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
        
        {/* Glow decorations */}
        <div className="absolute right-0 bottom-0 w-44 h-44 bg-amber-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />

        <div className="space-y-4 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="text-xl"></span>
            <h3 className="text-base font-extrabold text-white tracking-tight">Achievements & Recognition</h3>
          </div>
          
          <ul className="space-y-3 font-semibold text-xs text-slate-300">
            <li className="flex items-center gap-2.5">
              <span className="w-5 h-5 bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-[10px] flex items-center justify-center rounded-full font-bold">1</span>
              <span>100% Attendance in April 2025</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-5 h-5 bg-blue-500/25 border border-blue-500/30 text-blue-400 text-[10px] flex items-center justify-center rounded-full font-bold">2</span>
              <span>Inter-school Science Quiz Winner</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-5 h-5 bg-amber-500/25 border border-amber-500/30 text-amber-400 text-[10px] flex items-center justify-center rounded-full font-bold">3</span>
              <span>Active Classroom Participant Badge</span>
            </li>
          </ul>

          <button
            onClick={() => navigate('/parent/profile')}
            className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-extrabold hover:underline"
          >
            View All Achievements
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>

        {/* Trophy illustration container */}
        <div className="w-32 h-32 flex-shrink-0 flex items-center justify-center relative">
          <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-xl animate-pulse" />
          <svg className="w-24 h-24 text-amber-400 transform group-hover:scale-105 transition-transform duration-500 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            {/* Fallback to simple school trophy path */}
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5m0 0l6-3m-6 3l-6-3" />
          </svg>
          <span className="absolute text-3xl z-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"></span>
        </div>
      </div>

      {/* Full Timetable Modal Viewer */}
      <Modal
        isOpen={showTimetableModal}
        onClose={() => setShowTimetableModal(false)}
        title={`Academic Timetable — Class ${studentClass || ''} Section ${studentSection || ''}`}
        size="lg"
      >
        <div className="overflow-x-auto p-1">
          <table className="w-full border-collapse text-xs" style={{ minWidth: 600 }}>
            <thead>
              <tr>
                <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-600 w-20">Day</th>
                {PERIODS.map(p => (
                  <th key={p.num} className="border border-gray-200 bg-gray-50 px-2 py-2 text-center font-semibold text-gray-600">
                    <div className="font-semibold">P{p.num}</div>
                    <div className="text-[9px] text-gray-400 font-normal">{p.time}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map(day => (
                <tr key={day}>
                  <td className="border border-gray-200 px-3 py-2 font-semibold text-gray-700 bg-gray-50/50">{day}</td>
                  {PERIODS.map(p => {
                    const slot = fullGrid[day][p.num];
                    const subj = slot?.subject || (day === 'Saturday' && p.num > 3 ? 'Free' : null);
                    const colorClass = subjectColors[subj] || 'bg-gray-50 text-gray-300';
                    return (
                      <td key={p.num} className="border border-gray-200 px-2 py-2 text-center">
                        {subj ? (
                          <div className={`${colorClass} rounded-md px-1 py-1 font-medium text-[10px]`}>
                            <div>{subj}</div>
                            {slot?.teacher && (
                              <div className="text-[9px] opacity-75 mt-0.5">
                                {slot.teacher.name?.split(' ').slice(-1)[0]}
                              </div>
                            )}
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
        </div>
      </Modal>

    </div>
  );
}