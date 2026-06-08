import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import API from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const icons = {
  search: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  collect: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  admission: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  list: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
};

export default function FCDashboard() {
  const [summary, setSummary] = useState(null);
  const [stats, setStats] = useState({ totalStudents: 0, pendingAdmissions: 0, totalCollectedAll: 0, totalPendingAll: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      API.get('/fc/summary'),
      API.get('/fc/students?limit=1'),
      API.get('/fc/admission-requests'),
    ]).then(([summaryRes, studentsRes, admissionsRes]) => {
      setSummary(summaryRes.data);

      const admissions = admissionsRes.data || [];
      const pendingCount = admissions.filter(a => a.status === 'pending').length;

      // Calculate totals across all months
      const monthlyData = summaryRes.data?.monthly || [];
      const totalCollectedAll = monthlyData.reduce((a, m) => a + (m.collected || 0), 0);
      const totalAll = monthlyData.reduce((a, m) => a + (m.total || 0), 0);

      setStats({
        totalStudents: admissions.length,
        pendingAdmissions: pendingCount,
        totalCollectedAll,
        totalPendingAll: totalAll - totalCollectedAll,
      });
    }).catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  // Current month stats from summary
  const currentMonthData = summary?.monthly?.find(m => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return m.month === months[new Date().getMonth()];
  }) || {};

  const collectionRate = currentMonthData.total
    ? Math.round((currentMonthData.collected / currentMonthData.total) * 100)
    : 0;

  const pieData = [
    { name: 'Collected', value: currentMonthData.collected || 0 },
    { name: 'Pending', value: (currentMonthData.total || 0) - (currentMonthData.collected || 0) },
  ];

  const quickActions = [
    { icon: icons.search, label: 'Search Student', path: '/fc/search', bg: 'bg-slate-700 hover:bg-slate-800' },
    { icon: icons.collect, label: 'Collect Fee', path: '/fc/collect', bg: 'bg-emerald-600 hover:bg-emerald-700' },
    { icon: icons.admission, label: 'New Admission', path: '/fc/admission', bg: 'bg-indigo-600 hover:bg-indigo-700' },
    { icon: icons.list, label: 'Admissions List', path: '/fc/admissions', bg: 'bg-amber-600 hover:bg-amber-700' },
  ];

  return (
    <div className="space-y-5">
      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map(a => (
          <button key={a.path} onClick={() => navigate(a.path)}
            className={`${a.bg} text-white rounded-xl p-4 text-left transition-all active:scale-[0.98] flex items-center gap-3`}>
            <span className="flex-shrink-0 opacity-80">{a.icon}</span>
            <span className="text-xs sm:text-sm font-medium">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500">This Month Total</p>
          <p className="text-xl font-bold mt-1.5 text-gray-800">
            {loading ? '—' : formatCurrency(currentMonthData.total || 0)}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500">Collected</p>
          <p className="text-xl font-bold mt-1.5 text-emerald-600">
            {loading ? '—' : formatCurrency(currentMonthData.collected || 0)}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500">Pending</p>
          <p className="text-xl font-bold mt-1.5 text-red-500">
            {loading ? '—' : formatCurrency((currentMonthData.total || 0) - (currentMonthData.collected || 0))}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500">Collection Rate</p>
          <p className={`text-xl font-bold mt-1.5 ${collectionRate >= 80 ? 'text-emerald-600' : collectionRate > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
            {loading ? '—' : `${collectionRate}%`}
          </p>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500">Total Students</p>
          <p className="text-xl font-bold mt-1.5 text-gray-800">{loading ? '—' : stats.totalStudents}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500">Pending Admissions</p>
          <p className="text-xl font-bold mt-1.5 text-amber-600">{loading ? '—' : stats.pendingAdmissions}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500">Year Collected</p>
          <p className="text-xl font-bold mt-1.5 text-emerald-600">{loading ? '—' : formatCurrency(stats.totalCollectedAll)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500">Year Pending</p>
          <p className="text-xl font-bold mt-1.5 text-red-500">{loading ? '—' : formatCurrency(stats.totalPendingAll)}</p>
        </div>
      </div>

      {/* Charts */}
      {!loading && summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Monthly Collection</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={summary.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v > 0 ? `₹${(v/1000).toFixed(0)}K` : '₹0'} width={42} />
                <Tooltip formatter={v => [formatCurrency(v), '']} />
                <Bar dataKey="collected" fill="#059669" radius={[4,4,0,0]} name="Collected" maxBarSize={32} />
                <Bar dataKey="total" fill="#e2e8f0" radius={[4,4,0,0]} name="Total" maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Month Status</h3>
            {(currentMonthData.total || 0) > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={50} outerRadius={75}
                    paddingAngle={3} dataKey="value">
                    <Cell fill="#059669" /><Cell fill="#fca5a5" />
                  </Pie>
                  <Tooltip formatter={v => [formatCurrency(v), '']} />
                  <Legend iconSize={10} formatter={v => <span style={{ fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">
                No fee data for this month yet
              </div>
            )}
          </div>

          {summary.class_wise?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 lg:col-span-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Class-wise Collection</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={summary.class_wise} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => v > 0 ? `₹${(v/1000).toFixed(0)}K` : '₹0'} />
                  <YAxis type="category" dataKey="class" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip formatter={v => [formatCurrency(v), '']} />
                  <Bar dataKey="collected" fill="#4f46e5" radius={[0,4,4,0]} name="Collected" maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}