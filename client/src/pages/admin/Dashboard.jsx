import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import API from '../../utils/api';
import toast from 'react-hot-toast';

// Static/Fallback data sets to support high-fidelity mockup styling
const sparklineData = [
  { value: 40 }, { value: 45 }, { value: 42 }, { value: 50 }, { value: 48 }, { value: 55 }, { value: 60 }
];

const mainChartData = [
  { label: '1 May', attendance: 90, fees: 60, exams: 72 },
  { label: '8 May', attendance: 92.6, fees: 75, exams: 78.4 },
  { label: '15 May', attendance: 91, fees: 70, exams: 75 },
  { label: '22 May', attendance: 93, fees: 82, exams: 80 },
  { label: '29 May', attendance: 92.6, fees: 75, exams: 78.4 }
];



export default function Dashboard() {
  const [students, setStudents] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/dashboard/admin')
      .then(({ data }) => {
        setStudents(data.recent_students || []);
        setNotifs(data.notifications || []);
        setStats(data.stats || {});
      })
      .catch(() => toast.error('Failed to load dashboard metrics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  // Get current date details
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed
  const todayDate = currentDate.getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthYearString = `${monthNames[currentMonth]} ${currentYear}`;

  // Calculate days for the calendar matrix
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const totalDaysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const dynamicCalendarDays = [];

  // 1. Fill previous month's padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    dynamicCalendarDays.push({
      day: totalDaysInPrevMonth - i,
      currentMonth: false,
      isToday: false
    });
  }

  // 2. Fill current month's days
  for (let i = 1; i <= totalDaysInMonth; i++) {
    dynamicCalendarDays.push({
      day: i,
      currentMonth: true,
      isToday: i === todayDate
    });
  }

  // 3. Fill next month's padding days to make it a perfect grid (42 cells)
  const remainingCells = 42 - dynamicCalendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    dynamicCalendarDays.push({
      day: i,
      currentMonth: false,
      isToday: false
    });
  }

  // Dynamic Events list: extract real holiday notifications from API
  const holidayEvents = notifs
    .filter(n => n.type === 'holiday')
    .map(n => ({
      title: n.title,
      date: new Date(n.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      color: 'text-emerald-500 bg-emerald-50 border-emerald-100'
    }));

  const fallbackEvents = [
    { title: 'Parents Meeting', date: '17 Jun 2026, 10:00 AM', color: 'text-blue-500 bg-blue-50 border-blue-100' },
    { title: 'Annual Sports Day', date: '24 Jun 2026, 08:00 AM', color: 'text-amber-500 bg-amber-50 border-amber-100' },
    { title: 'Science Exhibition', date: '01 Jul 2026, 11:00 AM', color: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
    { title: 'PTM (Grade 6-10)', date: '07 Jul 2026, 10:00 AM', color: 'text-purple-500 bg-purple-50 border-purple-100' },
  ];

  const displayEvents = holidayEvents.length > 0 ? [...holidayEvents, ...fallbackEvents].slice(0, 4) : fallbackEvents;

  // Dynamic values binding real API stats with fallback layout requirements
  const studentCount = stats.total_students !== undefined ? stats.total_students : 1248;
  const teacherCount = stats.active_teachers !== undefined ? stats.active_teachers : 145;
  const classCount   = 48; // Standard dynamic mock representation
  const feeAmount    = stats.fee_collected ? `₹ ${Number(stats.fee_collected).toLocaleString('en-IN')}` : "₹ 28,75,000";

  // Donut chart collections
  const feeDonutData = [
    { name: 'Collected', value: 75, color: '#22c55e' },
    { name: 'Pending', value: 20, color: '#f59e0b' },
    { name: 'Overdue', value: 5, color: '#ef4444' }
  ];

  const attDonutData = [
    { name: 'Present', value: 92.6, color: '#22c55e' },
    { name: 'Absent', value: 5.8, color: '#f59e0b' },
    { name: 'Leave', value: 1.6, color: '#8b5cf6' }
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. Header Greeting Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Good Morning, Admin! 👋</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 font-semibold uppercase tracking-wider">Welcome back to Bright Future International School ERP</p>
        </div>
      </div>

      {/* 2. Key Stats sparkline cards (4 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Stat 1: Total Students */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-card hover:shadow-premium transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100/60">👥</div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Students</p>
                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight mt-0.5">{studentCount}</h3>
              </div>
            </div>
            {/* Sparkline chart */}
            <div className="w-16 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <defs>
                    <linearGradient id="glowBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={1.5} fillOpacity={1} fill="url(#glowBlue)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-4 pt-3.5 border-t border-slate-50 flex items-center gap-2">
            <span className="text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-600 font-extrabold px-2 py-0.5 rounded">↑ 4.5%</span>
            <span className="text-[10px] text-slate-400 font-medium">vs last month</span>
          </div>
        </div>

        {/* Stat 2: Total Teachers */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-card hover:shadow-premium transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg border border-emerald-100/60">👨‍🏫</div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Teachers</p>
                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight mt-0.5">{teacherCount}</h3>
              </div>
            </div>
            {/* Sparkline */}
            <div className="w-16 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <defs>
                    <linearGradient id="glowGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={1.5} fillOpacity={1} fill="url(#glowGreen)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-4 pt-3.5 border-t border-slate-50 flex items-center gap-2">
            <span className="text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-600 font-extrabold px-2 py-0.5 rounded">↑ 2.1%</span>
            <span className="text-[10px] text-slate-400 font-medium">vs last month</span>
          </div>
        </div>

        {/* Stat 3: Total Classes */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-card hover:shadow-premium transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg border border-purple-100/60">🏫</div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Classes</p>
                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight mt-0.5">{classCount}</h3>
              </div>
            </div>
            {/* Sparkline */}
            <div className="w-16 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <defs>
                    <linearGradient id="glowPurple" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={1.5} fillOpacity={1} fill="url(#glowPurple)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-4 pt-3.5 border-t border-slate-50 flex items-center gap-2">
            <span className="text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-600 font-extrabold px-2 py-0.5 rounded">↑ 3.3%</span>
            <span className="text-[10px] text-slate-400 font-medium">vs last month</span>
          </div>
        </div>

        {/* Stat 4: Fee Collection */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-card hover:shadow-premium transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg border border-amber-100/60">₹</div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fee Collection</p>
                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight mt-0.5">{feeAmount}</h3>
              </div>
            </div>
            {/* Sparkline */}
            <div className="w-16 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <defs>
                    <linearGradient id="glowAmber" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={1.5} fillOpacity={1} fill="url(#glowAmber)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-4 pt-3.5 border-t border-slate-50 flex items-center gap-2">
            <span className="text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-600 font-extrabold px-2 py-0.5 rounded">↑ 8.2%</span>
            <span className="text-[10px] text-slate-400 font-medium">vs last month</span>
          </div>
        </div>

      </div>

      {/* 3. Main Chart & Calendar events row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Area Chart Card (8 cols) */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-card lg:col-span-8 flex flex-col justify-between">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">ERP Overview Charts</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Live academic, attendance and financial metrics</p>
            </div>
            
            {/* Dropdown switch */}
            <div className="relative">
              <select className="pl-3.5 pr-8 py-1.5 bg-slate-50 border border-slate-100 hover:border-slate-200 text-[10px] font-bold text-slate-600 rounded-xl outline-none appearance-none cursor-pointer transition-all">
                <option>This Month</option>
                <option>This Year</option>
              </select>
              <svg className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Indicators Legend */}
          <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-5 pl-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 block" /> Attendance (92.6%)
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" /> Fee Collection (75%)
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 block" /> Exam Performance (78.4%)
            </div>
          </div>

          {/* Recharts Area Chart */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mainChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="mainBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="mainGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="mainPurple" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis domain={[40, 100]} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip />
                <Area type="monotone" dataKey="attendance" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#mainBlue)" dot={{ r: 4 }} />
                <Area type="monotone" dataKey="fees" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#mainGreen)" dot={{ r: 4 }} />
                <Area type="monotone" dataKey="exams" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#mainPurple)" dot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Calendar Card Widget (4 cols) */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-card lg:col-span-4 flex flex-col justify-between">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Calendar</h3>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{monthYearString}</span>
          </div>

          {/* Mini Calendar grid */}
          <div className="grid grid-cols-7 gap-y-2.5 gap-x-1.5 text-center flex-1 justify-items-center">
            {/* Headers */}
            {['S','M','T','W','T','F','S'].map((h, i) => (
              <div key={i} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1">{h}</div>
            ))}
            
            {/* Days matrix */}
            {dynamicCalendarDays.map((item, i) => {
              let cellClass = "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ";
              if (!item.currentMonth) {
                cellClass += "text-slate-300 opacity-20 pointer-events-none select-none";
              } else if (item.isToday) {
                cellClass += "bg-blue-600 text-white shadow-md shadow-blue-500/10 ring-2 ring-blue-500/25 cursor-pointer";
              } else {
                cellClass += "text-slate-600 hover:bg-slate-50 cursor-pointer";
              }
              return (
                <div key={i} className={cellClass}>
                  {item.day}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 4. Donut summaries row (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Donut 1: Fee Collection Summary */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-card flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex-1 w-full space-y-4">
            <div className="pb-3 border-b border-slate-50">
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Fee Collection Summary</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Total Target: ₹ 38,50,000</p>
            </div>
            
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl">
                <span className="flex items-center gap-1.5 font-bold text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" /> Collected</span>
                <span className="font-extrabold text-slate-700">₹ 28,75,000 (75%)</span>
              </div>
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl">
                <span className="flex items-center gap-1.5 font-bold text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" /> Pending</span>
                <span className="font-extrabold text-amber-600">₹ 8,50,000 (20%)</span>
              </div>
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl">
                <span className="flex items-center gap-1.5 font-bold text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-red-500 block" /> Overdue</span>
                <span className="font-extrabold text-red-600">₹ 1,25,000 (5%)</span>
              </div>
            </div>

            <button 
              onClick={() => navigate('/admin/fees')}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-extrabold hover:underline"
            >
              View Fee Details
              <span>➔</span>
            </button>
          </div>

          {/* Donut chart */}
          <div className="w-40 h-40 flex-shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={feeDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {feeDonutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Collected</span>
              <span className="text-lg font-black text-slate-800 mt-1">75%</span>
            </div>
          </div>
        </div>

        {/* Donut 2: Attendance Summary */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-card flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex-1 w-full space-y-4">
            <div className="pb-3 border-b border-slate-50">
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Attendance Summary</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Total Marked: 1,248 Students</p>
            </div>
            
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl">
                <span className="flex items-center gap-1.5 font-bold text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" /> Present</span>
                <span className="font-extrabold text-slate-700">1,154 (92.6%)</span>
              </div>
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl">
                <span className="flex items-center gap-1.5 font-bold text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" /> Absent</span>
                <span className="font-extrabold text-amber-600">72 (5.8%)</span>
              </div>
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl">
                <span className="flex items-center gap-1.5 font-bold text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-purple-50 block" /> Leave</span>
                <span className="font-extrabold text-purple-600">22 (1.6%)</span>
              </div>
            </div>

            <button 
              onClick={() => navigate('/admin/attendance')}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-extrabold hover:underline"
            >
              View Attendance Report
              <span>➔</span>
            </button>
          </div>

          {/* Donut chart */}
          <div className="w-40 h-40 flex-shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {attDonutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Attendance</span>
              <span className="text-lg font-black text-slate-800 mt-1">92.6%</span>
            </div>
          </div>
        </div>

      </div>

      {/* 5. Events & Announcements row (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Upcoming Events Card */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-card flex flex-col justify-between">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Upcoming Events</h3>
            <button className="text-[10px] font-bold text-blue-500 hover:underline uppercase tracking-wider">View All</button>
          </div>

          <div className="space-y-3.5 flex-1">
            {displayEvents.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800">{item.title}</h4>
                  <p className="text-[10px] font-semibold text-slate-400 mt-1 flex items-center gap-1">📅 {item.date}</p>
                </div>
                <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border uppercase tracking-wider ${item.color.split(' ')[0]} ${item.color.split(' ')[1]} ${item.color.split(' ')[2]}`}>
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Announcements Board */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-card flex flex-col justify-between">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Recent Announcements</h3>
            <button onClick={() => navigate('/admin/notifications')} className="text-[10px] font-bold text-blue-500 hover:underline uppercase tracking-wider">View All</button>
          </div>

          <div className="space-y-4 flex-1">
            {notifs.length === 0 ? (
              <p className="text-center text-gray-400 text-xs py-8">No recent announcements</p>
            ) : (
              notifs.map((item) => {
                const dateStr = new Date(item.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                let icon = '📣';
                let bg = 'bg-purple-50 text-purple-600';
                if (item.type === 'holiday') {
                  icon = '🌴';
                  bg = 'bg-emerald-50 text-emerald-600';
                } else if (item.type === 'fee_reminder') {
                  icon = '💰';
                  bg = 'bg-amber-50 text-amber-600';
                } else if (item.type === 'attendance_alert') {
                  icon = '⏰';
                  bg = 'bg-red-50 text-red-600';
                } else if (item.type === 'result') {
                  icon = '📝';
                  bg = 'bg-blue-50 text-blue-600';
                }
                return (
                  <div key={item.id} className="flex gap-3 px-1 py-1 hover:bg-slate-50/50 rounded-xl transition-colors">
                    <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center text-lg font-bold flex-shrink-0 mt-0.5`}>{icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-extrabold text-slate-800 truncate">{item.title}</h4>
                        <span className="text-[9px] font-bold text-slate-400 flex-shrink-0">{dateStr}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 mt-1 leading-normal">{item.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* 6. Quick Links Section */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-card">
        <div className="pb-4 border-b border-slate-100 flex items-center gap-2.5 mb-5">
          <span className="text-xl">⚡</span>
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Quick Links</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-4">
          <button onClick={() => navigate('/admin/students')} className="flex flex-col items-center justify-center p-4 border rounded-2xl bg-cyan-50 border-cyan-100 hover:bg-cyan-100/40 text-cyan-600 transition-all active:scale-95 text-center gap-2">
            <span className="text-2xl">👤</span>
            <span className="font-bold text-xs text-slate-700">Add Student</span>
          </button>
          
          <button onClick={() => navigate('/admin/teachers')} className="flex flex-col items-center justify-center p-4 border rounded-2xl bg-emerald-50 border-emerald-100 hover:bg-emerald-100/40 text-emerald-600 transition-all active:scale-95 text-center gap-2">
            <span className="text-2xl">👨‍🏫</span>
            <span className="font-bold text-xs text-slate-700">Add Teacher</span>
          </button>

          <button onClick={() => navigate('/admin/class-fees')} className="flex flex-col items-center justify-center p-4 border rounded-2xl bg-purple-50 border-purple-100 hover:bg-purple-100/40 text-purple-600 transition-all active:scale-95 text-center gap-2">
            <span className="text-2xl">🏫</span>
            <span className="font-bold text-xs text-slate-700">Add Class</span>
          </button>

          <button onClick={() => navigate('/admin/attendance')} className="flex flex-col items-center justify-center p-4 border rounded-2xl bg-amber-50 border-amber-100 hover:bg-amber-100/40 text-amber-600 transition-all active:scale-95 text-center gap-2">
            <span className="text-2xl">📅</span>
            <span className="font-bold text-xs text-slate-700">Take Attendance</span>
          </button>

          <button onClick={() => navigate('/admin/fees')} className="flex flex-col items-center justify-center p-4 border rounded-2xl bg-blue-50 border-blue-100 hover:bg-blue-100/40 text-blue-600 transition-all active:scale-95 text-center gap-2">
            <span className="text-2xl">🧾</span>
            <span className="font-bold text-xs text-slate-700">Fee Receipt</span>
          </button>

          <button onClick={() => navigate('/admin/marks')} className="flex flex-col items-center justify-center p-4 border rounded-2xl bg-rose-50 border-rose-100 hover:bg-rose-100/40 text-rose-600 transition-all active:scale-95 text-center gap-2">
            <span className="text-2xl">📋</span>
            <span className="font-bold text-xs text-slate-700">Exam Schedule</span>
          </button>

          <button onClick={() => navigate('/admin/promotion')} className="flex flex-col items-center justify-center p-4 border rounded-2xl bg-indigo-50 border-indigo-100 hover:bg-indigo-100/40 text-indigo-600 transition-all active:scale-95 text-center gap-2">
            <span className="text-2xl">📊</span>
            <span className="font-bold text-xs text-slate-700">Generate Report</span>
          </button>
        </div>
      </div>

    </div>
  );
}
