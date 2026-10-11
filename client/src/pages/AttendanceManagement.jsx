import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Badge } from '../components/Badge';
import { CheckSquare, Save, Users, Calendar, CheckCircle2, XCircle } from 'lucide-react';

export function AttendanceManagement() {
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchSchedules = async () => {
    try {
      const res = await api.get('/exams/schedules');
      setSchedules(res.data.data);
      if (res.data.data.length > 0) {
        setSelectedScheduleId(res.data.data[0].schedule_id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (!selectedScheduleId) return;

    const loadRosterAndAttendance = async () => {
      setLoading(true);
      setMessage('');
      try {
        const schedule = schedules.find((s) => s.schedule_id === Number(selectedScheduleId));
        const courseId = schedule?.exam?.subject?.course_id;

        const [studentsRes, attRes] = await Promise.all([
          api.get(`/academic/students?limit=100${courseId ? `&course_id=${courseId}` : ''}`),
          api.get(`/eval/attendance/${selectedScheduleId}`),
        ]);

        const roster = studentsRes.data.data || [];
        setStudents(roster);

        // Preload marked attendance
        const map = {};
        attRes.data.data.forEach((a) => {
          map[a.student_id] = a.status;
        });

        // Default unset students to Present
        roster.forEach((s) => {
          if (!map[s.student_id]) map[s.student_id] = 'Present';
        });

        setAttendanceMap(map);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadRosterAndAttendance();
  }, [selectedScheduleId, schedules]);

  const handleStatusToggle = (studentId, status) => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    setMessage('');
    try {
      const records = Object.entries(attendanceMap).map(([studentId, status]) => ({
        student_id: Number(studentId),
        status,
      }));

      await api.post('/eval/attendance', {
        schedule_id: Number(selectedScheduleId),
        records,
      });

      setMessage('Attendance successfully committed. Cumulative attendance percentages recalculated.');
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving attendance.');
    } finally {
      setSaving(false);
    }
  };

  const currentSchedule = schedules.find((s) => s.schedule_id === Number(selectedScheduleId));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Examination Attendance Roster</h1>
          <p className="text-xs text-slate-500 mt-1">
            Record physical or online candidate presence. System recalculates cumulative eligibility metrics.
          </p>
        </div>

        <button
          onClick={handleSaveAttendance}
          disabled={saving || students.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Commit Attendance'}
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Select Schedule */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center gap-4">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0">
          Examination Session:
        </label>
        <select
          value={selectedScheduleId}
          onChange={(e) => setSelectedScheduleId(e.target.value)}
          className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
        >
          {schedules.map((sch) => (
            <option key={sch.schedule_id} value={sch.schedule_id}>
              {sch.exam.subject.subject_code} - {sch.exam.subject.subject_name} ({sch.venue}) | {new Date(sch.exam_date).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      {/* Student Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Enrollment No</th>
                <th className="px-6 py-3.5">Candidate Name</th>
                <th className="px-6 py-3.5">Degree Program</th>
                <th className="px-6 py-3.5">Batch</th>
                <th className="px-6 py-3.5">Cumulative Attendance</th>
                <th className="px-6 py-3.5 text-center">Session Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400">Loading student roster...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400">No students enrolled in this examination's course.</td>
                </tr>
              ) : (
                students.map((s) => {
                  const status = attendanceMap[s.student_id] || 'Present';
                  return (
                    <tr key={s.student_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-blue-700">{s.enrollment_no}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{s.user.full_name}</td>
                      <td className="px-6 py-4 text-slate-500">{s.course?.course_name}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{s.batch_year}</td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {Number(s.attendance_pct).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(s.student_id, 'Present')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                              status === 'Present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(s.student_id, 'Absent')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                              status === 'Absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
