import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { Calendar, Plus, Clock, MapPin, AlertTriangle, CheckCircle2, Globe, Shield } from 'lucide-react';

export function ExamScheduling() {
  const [schedules, setSchedules] = useState([]);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Exam Modal
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [examForm, setExamForm] = useState({
    subject_id: '',
    exam_type: 'Internal',
    total_marks: 50,
    duration_minutes: 60,
  });

  // New Schedule Modal
  const [isSchedModalOpen, setIsSchedModalOpen] = useState(false);
  const [schedForm, setSchedForm] = useState({
    exam_id: '',
    exam_date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    end_time: '11:00',
    venue: 'Main Examination Hall A',
    batch_year: 2024,
    assigned_faculty_id: '',
    is_published: false,
  });

  const [conflictWarning, setConflictWarning] = useState(null);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [schedRes, examsRes, subRes, facRes] = await Promise.all([
        api.get('/exams/schedules'),
        api.get('/exams/exams'),
        api.get('/academic/subjects'),
        api.get('/academic/faculty'),
      ]);
      setSchedules(schedRes.data.data);
      setExams(examsRes.data.data);
      setSubjects(subRes.data.data);
      setFacultyList(facRes.data.data);

      if (subRes.data.data.length > 0) {
        setExamForm((prev) => ({ ...prev, subject_id: subRes.data.data[0].subject_id }));
      }
      if (examsRes.data.data.length > 0) {
        setSchedForm((prev) => ({ ...prev, exam_id: examsRes.data.data[0].exam_id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Live conflict detection on schedule form changes
  const runConflictCheck = async () => {
    setCheckingConflict(true);
    setConflictWarning(null);
    try {
      const res = await api.post('/exams/schedules/check-conflict', {
        exam_date: schedForm.exam_date,
        start_time: schedForm.start_time,
        end_time: schedForm.end_time,
        venue: schedForm.venue,
        batch_year: Number(schedForm.batch_year),
      });
      if (res.data.hasConflict) {
        setConflictWarning(res.data.message);
      } else {
        setConflictWarning(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingConflict(false);
    }
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/exams/exams', {
        subject_id: Number(examForm.subject_id),
        exam_type: examForm.exam_type,
        total_marks: Number(examForm.total_marks),
        duration_minutes: Number(examForm.duration_minutes),
      });
      setIsExamModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating exam definition.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/exams/schedules', {
        exam_id: Number(schedForm.exam_id),
        exam_date: schedForm.exam_date,
        start_time: schedForm.start_time,
        end_time: schedForm.end_time,
        venue: schedForm.venue.trim(),
        batch_year: Number(schedForm.batch_year),
        assigned_faculty_id: schedForm.assigned_faculty_id ? Number(schedForm.assigned_faculty_id) : null,
        is_published: Boolean(schedForm.is_published),
      });
      setIsSchedModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Conflict detected or schedule error.');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (scheduleId, currentStatus) => {
    try {
      await api.put(`/exams/schedules/${scheduleId}/publish`, {
        is_published: !currentStatus,
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating schedule publication state');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Examination Master & Schedules</h1>
          <p className="text-xs text-slate-500 mt-1">
            Define exams, schedule venues with automated conflict checking, and publish official timetables
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => { setError(''); setIsExamModalOpen(true); }}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            Define Exam
          </button>
          <button
            onClick={() => { setError(''); setConflictWarning(null); setIsSchedModalOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Schedule Session
          </button>
        </div>
      </div>

      {/* Schedules Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Date & Time</th>
                <th className="px-6 py-3.5">Subject & Code</th>
                <th className="px-6 py-3.5">Exam Type</th>
                <th className="px-6 py-3.5">Venue</th>
                <th className="px-6 py-3.5">Batch</th>
                <th className="px-6 py-3.5">Invigilator</th>
                <th className="px-6 py-3.5">Publication</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-400">Loading schedules...</td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-400">No examination sessions scheduled yet.</td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.schedule_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900 block">
                        {new Date(s.exam_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-slate-400 text-[11px] font-mono">
                        {s.start_time} - {s.end_time}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-blue-700 mr-2">{s.exam?.subject?.subject_code}</span>
                      <span className="font-medium text-slate-800">{s.exam?.subject?.subject_name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={s.exam?.exam_type === 'Online' ? 'purple' : s.exam?.exam_type === 'External' ? 'warning' : 'default'}>
                        {s.exam?.exam_type} ({s.exam?.total_marks} Marks)
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {s.venue}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      Batch {s.batch_year || 'All'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {s.assigned_faculty?.user?.full_name || <span className="text-slate-400 italic">None</span>}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={s.is_published ? 'success' : 'default'}>
                        {s.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => togglePublish(s.schedule_id, s.is_published)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          s.is_published
                            ? 'text-slate-600 hover:bg-slate-100 border border-slate-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        }`}
                      >
                        {s.is_published ? 'Unpublish' : 'Publish Timetable'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Define Exam Definition Modal */}
      <Modal isOpen={isExamModalOpen} onClose={() => setIsExamModalOpen(false)} title="Define Master Examination">
        <form onSubmit={handleSaveExam} className="space-y-4">
          {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{error}</div>}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Academic Subject
            </label>
            <select
              value={examForm.subject_id}
              onChange={(e) => setExamForm({ ...examForm, subject_id: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              {subjects.map((sub) => (
                <option key={sub.subject_id} value={sub.subject_id}>
                  {sub.subject_code} - {sub.subject_name} ({sub.course?.course_name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Exam Type
              </label>
              <select
                value={examForm.exam_type}
                onChange={(e) => setExamForm({ ...examForm, exam_type: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              >
                <option value="Internal">Internal</option>
                <option value="External">External</option>
                <option value="Online">Online</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Total Marks
              </label>
              <input
                type="number"
                min={10}
                max={200}
                value={examForm.total_marks}
                onChange={(e) => setExamForm({ ...examForm, total_marks: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Duration (Mins)
              </label>
              <input
                type="number"
                min={15}
                max={300}
                value={examForm.duration_minutes}
                onChange={(e) => setExamForm({ ...examForm, duration_minutes: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsExamModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              {saving ? 'Saving...' : 'Create Exam'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Schedule Session Modal with Live Conflict Detection */}
      <Modal isOpen={isSchedModalOpen} onClose={() => setIsSchedModalOpen(false)} title="Schedule Examination Session">
        <form onSubmit={handleSaveSchedule} className="space-y-4">
          {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{error}</div>}

          {conflictWarning && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{conflictWarning}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Examination
            </label>
            <select
              value={schedForm.exam_id}
              onChange={(e) => setSchedForm({ ...schedForm, exam_id: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              {exams.map((ex) => (
                <option key={ex.exam_id} value={ex.exam_id}>
                  {ex.subject.subject_code} - {ex.subject.subject_name} ({ex.exam_type}, {ex.total_marks} Marks)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Exam Date
              </label>
              <input
                type="date"
                required
                value={schedForm.exam_date}
                onChange={(e) => { setSchedForm({ ...schedForm, exam_date: e.target.value }); }}
                onBlur={runConflictCheck}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Start Time
              </label>
              <input
                type="time"
                required
                value={schedForm.start_time}
                onChange={(e) => { setSchedForm({ ...schedForm, start_time: e.target.value }); }}
                onBlur={runConflictCheck}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                End Time
              </label>
              <input
                type="time"
                required
                value={schedForm.end_time}
                onChange={(e) => { setSchedForm({ ...schedForm, end_time: e.target.value }); }}
                onBlur={runConflictCheck}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Designated Venue / Room
              </label>
              <input
                type="text"
                required
                value={schedForm.venue}
                onChange={(e) => { setSchedForm({ ...schedForm, venue: e.target.value }); }}
                onBlur={runConflictCheck}
                placeholder="e.g. Auditorium Hall 101"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Eligible Batch Year
              </label>
              <input
                type="number"
                min={2020}
                max={2030}
                value={schedForm.batch_year}
                onChange={(e) => { setSchedForm({ ...schedForm, batch_year: e.target.value }); }}
                onBlur={runConflictCheck}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Assigned Faculty Invigilator
            </label>
            <select
              value={schedForm.assigned_faculty_id}
              onChange={(e) => setSchedForm({ ...schedForm, assigned_faculty_id: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
            >
              <option value="">-- None (Self Proctored) --</option>
              {facultyList.map((f) => (
                <option key={f.faculty_id} value={f.faculty_id}>
                  {f.user.full_name} ({f.department})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="publish_now"
              checked={schedForm.is_published}
              onChange={(e) => setSchedForm({ ...schedForm, is_published: e.target.checked })}
              className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="publish_now" className="text-xs font-medium text-slate-700">
              Publish timetable immediately to student portal
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSchedModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || checkingConflict || Boolean(conflictWarning)}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50"
            >
              {saving ? 'Validating Conflicts...' : 'Save Schedule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
