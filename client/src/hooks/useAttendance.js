import { useState, useCallback } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';

export const useAttendance = () => {
  const [records, setRecords]   = useState([]);
  const [stats, setStats]       = useState({});
  const [loading, setLoading]   = useState(false);

  const fetchStudentAttendance = useCallback(async (studentId, month, year) => {
    setLoading(true);
    try {
      const res = await API.get(`/attendance/student/${studentId}?month=${month}&year=${year}`);
      setRecords(res.data.records || []);
      setStats(res.data.stats || {});
    } catch {
      toast.error('Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClassAttendance = useCallback(async (cls, section, date) => {
    setLoading(true);
    try {
      const res = await API.get(`/attendance/class?class=${cls}&section=${section}&date=${date}`);
      setRecords(res.data || []);
    } catch {
      toast.error('Failed to load class attendance.');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveBulkAttendance = async (cls, section, date, attendanceMap, sessionId) => {
    const records = Object.entries(attendanceMap).map(([student_id, status]) => ({
      student_id: parseInt(student_id), status
    }));
    await API.post('/attendance/bulk', { class: cls, section, date, records, session_id: sessionId });
  };

  return { records, stats, loading, fetchStudentAttendance, fetchClassAttendance, saveBulkAttendance };
};