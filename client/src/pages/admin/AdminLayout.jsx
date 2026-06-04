import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../../components/common/Sidebar';
import TopBar  from '../../components/common/TopBar';

const titles = {
  '/admin':               'Dashboard',
  '/admin/students':      'Student Management',
  '/admin/teachers':      'Teacher Management',
  '/admin/attendance':    'Attendance',
  '/admin/teacher-attendance': 'Teacher Attendance',
  '/admin/fees':          'Fees Management',
  '/admin/class-fees':    'Class Fees',
  '/admin/fee-structure': 'Class Fees',
  '/admin/marks':         'Marks & Results',
  '/admin/timetable':     'Timetable',
  '/admin/promotion':     'Session & Promotion',
  '/admin/notifications': 'Notifications',
  '/admin/credentials':   'Credential Management',
};

export default function AdminLayout() {
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          title={titles[pathname] || 'Admin'}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
