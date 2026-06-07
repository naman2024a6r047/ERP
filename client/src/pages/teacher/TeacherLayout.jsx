import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../../components/common/Sidebar';
import TopBar  from '../../components/common/TopBar';

const titles = {
  '/teacher':            'Teacher Dashboard',
  '/teacher/attendance': 'Mark Attendance',
  '/teacher/marks':      'Enter Marks',
  '/teacher/incharge-results': 'Incharge Results',
  '/teacher/my-attendance': 'My Attendance',
  '/teacher/profile':      'My Profile',
};

export default function TeacherLayout() {
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
          title={titles[pathname] || 'Teacher'}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
