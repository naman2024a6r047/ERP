import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import API from '../../utils/api';
import toast from 'react-hot-toast';

const PASSWORD_ROLES = ['admin', 'admin2', 'teacher', 'fee_collector'];

// Breadcrumbs helper mapping
const routeBreadcrumbs = {
  '/admin': ['Dashboard', 'Home'],
  '/admin/students': ['Dashboard', 'Student Management'],
  '/admin/student-approvals': ['Dashboard', 'Student Approvals'],
  '/admin/teachers': ['Dashboard', 'Teacher Management'],
  '/admin/teacher-attendance': ['Dashboard', 'Teacher Attendance'],
  '/admin/attendance': ['Dashboard', 'Student Attendance'],
  '/admin/fees': ['Dashboard', 'Fee Management'],
  '/admin/class-fees': ['Dashboard', 'Class Fees'],
  '/admin/marks': ['Dashboard', 'Examinations & Marks'],
  '/admin/timetable': ['Dashboard', 'Academic Timetable'],
  '/admin/promotion': ['Dashboard', 'Student Promotion'],
  '/admin/notifications': ['Dashboard', 'Notifications & Announcements'],
  '/admin/credentials': ['Dashboard', 'Credential Manager'],
  
  '/parent': ['Dashboard', 'My Child Overview'],
  '/parent/profile': ['Dashboard', 'My Profile'],
  '/parent/attendance': ['Dashboard', 'Attendance History'],
  '/parent/report-card': ['Dashboard', 'Results & Report Card'],
  '/parent/fees': ['Dashboard', 'Fee Structure & Status'],
  '/parent/notifications': ['Dashboard', 'Notices & Alerts'],
  
  '/teacher': ['Dashboard', 'Teacher Overview'],
  '/teacher/attendance': ['Dashboard', 'Mark Class Attendance'],
  '/teacher/marks': ['Dashboard', 'Enter Exam Marks'],
  '/teacher/incharge-results': ['Dashboard', 'Class Incharge Results'],
  '/teacher/my-attendance': ['Dashboard', 'My Attendance Log'],
  
  '/fc': ['Dashboard', 'Fee Collector Home'],
  '/fc/collect': ['Dashboard', 'Search & Collect Fees'],
  '/fc/admission': ['Dashboard', 'New Student Admission'],
  '/fc/admissions': ['Dashboard', 'Admissions Log'],
};

export default function TopBar({ title, onMenuClick }) {
  const { user } = useAuth();
  const location = useLocation();
  const canChangePassword = PASSWORD_ROLES.includes(user?.role);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [session, setSession] = useState('2024-25');

  const breadcrumb = routeBreadcrumbs[location.pathname] || ['Portal', title];
  const isStudentPortal = ['parent', 'student'].includes(user?.role);

  // Fallbacks to closely match Aarav Sharma inside student portal
  const profileName = isStudentPortal ? "Aarav Sharma" : user?.name || "Admin User";
  const profileSub  = isStudentPortal ? "Class 5-A" : user?.role === 'admin' ? "Super Admin" : "Staff User";
  const notificationCount = isStudentPortal ? 3 : 8;
  const messageCount = isStudentPortal ? 0 : 5;

  return (
    <header className="h-16 bg-white border-b border-slate-100 px-6 flex items-center justify-between flex-shrink-0 sticky top-0 z-20 shadow-sm shadow-slate-100/50">
      
      {/* Title & Breadcrumbs */}
      <div className="flex items-center gap-4">
        {/* Hamburger Mobile Toggle */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="min-w-0">
          <h1 className="text-base font-extrabold text-slate-800 tracking-tight leading-none">{title}</h1>
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-semibold text-slate-400">
            <span>{breadcrumb[0]}</span>
            <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-blue-500 font-bold">{breadcrumb[1]}</span>
          </div>
        </div>
      </div>

      {/* Global Actions Controls */}
      <div className="flex items-center gap-4 sm:gap-6">
        
        {/* Academic Session Picker */}
        <div className="relative hidden sm:flex items-center">
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <select
            value={session}
            onChange={(e) => setSession(e.target.value)}
            className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-100 hover:border-slate-200 text-xs font-bold text-slate-700 rounded-xl outline-none appearance-none cursor-pointer transition-all"
          >
            <option value="2024-25">Academic Session 2024-25</option>
            <option value="2023-24">Academic Session 2023-24</option>
          </select>
          <svg className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Dynamic Alerts Buttons */}
        <div className="flex items-center gap-2">
          
          {/* Messages Button (Only for Admins/Staff or mock showcase) */}
          {messageCount > 0 && (
            <button className="p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all relative">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-[9px] font-bold text-white flex items-center justify-center rounded-full ring-2 ring-white">
                {messageCount}
              </span>
            </button>
          )}

          {/* Notifications Bell */}
          <button className="p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all relative">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-[9px] font-bold text-white flex items-center justify-center rounded-full ring-2 ring-white animate-pulse">
              {notificationCount}
            </span>
          </button>
        </div>

        {/* Quick change password if authorized */}
        {canChangePassword && (
          <button
            onClick={() => setShowPassword(true)}
            className="hidden xl:block rounded-xl border border-slate-200 hover:border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Change Password
          </button>
        )}

        {/* User Account Info Dropdown */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-100">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-inner flex-shrink-0 relative group">
            {isStudentPortal ? (
              // Student Avatar Placeholder (Aarav Sharma representation)
              <img
                src="https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=100&auto=format&fit=crop&q=80"
                alt="Student Profile"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1544717305-2782549b5136?w=100&auto=format&fit=crop&q=80";
                }}
              />
            ) : (
              // Staff Avatar representation
              <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-extrabold text-sm flex items-center justify-center group-hover:scale-115 transition-transform duration-300">
                {user?.name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="hidden md:block leading-none">
            <div className="text-xs font-extrabold text-slate-800 max-w-[130px] truncate">{profileName}</div>
            <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{profileSub}</div>
          </div>
        </div>

      </div>

      {/* Change Password Dialog */}
      {showPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (form.newPassword.length < 6) return toast.error('New password must be at least 6 characters.');
              setSaving(true);
              try {
                await API.put('/auth/change-password', form);
                toast.success('Password changed successfully.');
                setShowPassword(false);
                setForm({ currentPassword: '', newPassword: '' });
              } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to change password.');
              } finally {
                setSaving(false);
              }
            }}
            className="w-full max-w-sm rounded-2xl bg-[#0b1021] border border-white/5 p-6 shadow-2xl backdrop-blur-xl"
          >
            <h2 className="text-base font-extrabold text-white">Change Password</h2>
            <p className="text-slate-400 text-xs mt-1">Provide credentials to modify key security passwords.</p>
            
            <div className="mt-5 space-y-4">
              <input
                type="password"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                placeholder="Current password"
                className="w-full bg-[#070b19]/60 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                required
              />
              <input
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                placeholder="New password"
                className="w-full bg-[#070b19]/60 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                required
              />
            </div>
            
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowPassword(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-400 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-blue-600/15 disabled:opacity-60 transition-all"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
}
