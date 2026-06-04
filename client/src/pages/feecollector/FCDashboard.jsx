import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import StatCard from '../../components/common/StatCard';
import API from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function FCDashboard() {
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/fc/summary')
      .then(r => setSummary(r.data))
      .catch(() => toast.error('Failed to load summary'))
      .finally(() => setLoading(false));
  }, []);

  const currentMonthData = summary?.monthly?.slice(-1)[0] || {};
  const collectionRate   = currentMonthData.total
    ? Math.round((currentMonthData.collected / currentMonthData.total) * 100)
    : 0;

  const pieData = [
    { name: 'Collected', value: currentMonthData.collected || 0 },
    { name: 'Pending',   value: (currentMonthData.total || 0) - (currentMonthData.collected || 0) },
  ];

  const quickActions = [
    { icon: '🔍', label: 'Search Student',    path: '/fc/search',    color: 'bg-blue-500' },
    { icon: '💰', label: 'Collect Fee',        path: '/fc/collect',   color: 'bg-green-500' },
    { icon: '📋', label: 'New Admission',      path: '/fc/admission', color: 'bg-purple-500' },
    { icon: '📁', label: 'Admission Requests', path: '/fc/admissions',color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">Fee Collector Dashboard</h2>
        <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Manage fee collections and admissions</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map(a => (
          <button key={a.path} onClick={() => navigate(a.path)}
            className={`${a.color} hover:opacity-90 active:opacity-80 text-white rounded-xl p-4 text-left transition-all active:scale-[0.98]`}>
            <span className="text-2xl block mb-2">{a.icon}</span>
            <span className="text-xs sm:text-sm font-semibold">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="This Month Total"     value={loading ? '—' : formatCurrency(currentMonthData.total     || 0)} />
        <StatCard label="Collected"            value={loading ? '—' : formatCurrency(currentMonthData.collected || 0)} color="text-green-600" />
        <StatCard label="Pending"              value={loading ? '—' : formatCurrency((currentMonthData.total || 0) - (currentMonthData.collected || 0))} color="text-red-500" />
        <StatCard label="Collection Rate"      value={loading ? '—' : `${collectionRate}%`} color={collectionRate >= 80 ? 'text-green-600' : 'text-yellow-600'} />
      </div>

      {/* Charts */}
      {!loading && summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Monthly bar chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Monthly Collection</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={summary.monthly.filter(m => m.total > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} width={42} />
                <Tooltip formatter={v => [formatCurrency(v), '']} />
                <Bar dataKey="collected" fill="#22c55e" radius={[4,4,0,0]} name="Collected" maxBarSize={40} />
                <Bar dataKey="total"     fill="#dbeafe" radius={[4,4,0,0]} name="Total"     maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart current month */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Month Status</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={50} outerRadius={75}
                  paddingAngle={3} dataKey="value">
                  <Cell fill="#22c55e" /><Cell fill="#fca5a5" />
                </Pie>
                <Tooltip formatter={v => [formatCurrency(v), '']} />
                <Legend iconSize={10} formatter={v => <span style={{ fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Class-wise */}
          {summary.class_wise?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 lg:col-span-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Class-wise Collection</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={summary.class_wise} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="class" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip formatter={v => [formatCurrency(v), '']} />
                  <Bar dataKey="collected" fill="#4f7ef8" radius={[0,4,4,0]} name="Collected" maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}