import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { BookOpen, Plus, Edit2, UserPlus, Trash2 } from 'lucide-react';

export function SubjectsManagement() {
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Subject Modal
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [subForm, setSubForm] = useState({
    subject_code: '',
    subject_name: '',
    course_id: '',
    semester: 1,
    credits: 4,
  });

  // Faculty Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedSubForAssign, setSelectedSubForAssign] = useState(null);
  const [assignForm, setAssignForm] = useState({
    faculty_id: '',
    is_primary_coordinator: false,
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [subsRes, coursesRes, facRes] = await Promise.all([
        api.get('/academic/subjects'),
        api.get('/academic/courses'),
        api.get('/academic/faculty'),
      ]);
      setSubjects(subsRes.data.data);
      setCourses(coursesRes.data.data);
      setFacultyList(facRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openSubModal = (sub = null) => {
    setEditingSub(sub);
    if (sub) {
      setSubForm({
        subject_code: sub.subject_code,
        subject_name: sub.subject_name,
        course_id: sub.course_id,
        semester: sub.semester,
        credits: sub.credits,
      });
    } else {
      setSubForm({
        subject_code: '',
        subject_name: '',
        course_id: courses[0]?.course_id || '',
        semester: 1,
        credits: 4,
      });
    }
    setError('');
    setIsSubModalOpen(true);
  };

  const handleSaveSub = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        subject_code: subForm.subject_code.trim(),
        subject_name: subForm.subject_name.trim(),
        course_id: Number(subForm.course_id),
        semester: Number(subForm.semester),
        credits: Number(subForm.credits),
      };

      if (editingSub) {
        await api.put(`/academic/subjects/${editingSub.subject_id}`, payload);
      } else {
        await api.post('/academic/subjects', payload);
      }
      setIsSubModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save subject.');
    } finally {
      setSaving(false);
    }
  };

  const openAssignModal = (sub) => {
    setSelectedSubForAssign(sub);
    setAssignForm({
      faculty_id: facultyList[0]?.faculty_id || '',
      is_primary_coordinator: false,
    });
    setError('');
    setIsAssignModalOpen(true);
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/academic/faculty-assignments', {
        subject_id: selectedSubForAssign.subject_id,
        faculty_id: Number(assignForm.faculty_id),
        is_primary_coordinator: Boolean(assignForm.is_primary_coordinator),
      });
      setIsAssignModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign faculty.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAssignment = async (subId, facId) => {
    if (!window.confirm('Are you sure you want to unassign this faculty member?')) return;
    try {
      await api.delete(`/academic/faculty-assignments/${facId}/${subId}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error removing assignment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Academic Subjects</h1>
          <p className="text-xs text-slate-500 mt-1">Course modules, credit allocations, and faculty coordinator assignments</p>
        </div>
        <button
          onClick={() => openSubModal()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Subject
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Subject Name</th>
                <th className="px-6 py-3.5">Degree Course</th>
                <th className="px-6 py-3.5">Semester</th>
                <th className="px-6 py-3.5">Credits</th>
                <th className="px-6 py-3.5">Assigned Faculty</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-400">Loading subjects...</td>
                </tr>
              ) : subjects.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-400">No subjects registered yet.</td>
                </tr>
              ) : (
                subjects.map((s) => (
                  <tr key={s.subject_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-blue-700">{s.subject_code}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{s.subject_name}</td>
                    <td className="px-6 py-4 text-slate-500">{s.course?.course_name}</td>
                    <td className="px-6 py-4 font-semibold">Sem {s.semester}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{s.credits} Credits</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {s.faculty_links?.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                        ) : (
                          s.faculty_links?.map((fl) => (
                            <span
                              key={fl.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                fl.is_primary_coordinator
                                  ? 'bg-blue-50 text-blue-800 border-blue-200 font-bold'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              <span>{fl.faculty.user.full_name}</span>
                              {fl.is_primary_coordinator && <span className="text-[9px] text-blue-600">(Coord)</span>}
                              <button
                                onClick={() => handleRemoveAssignment(s.subject_id, fl.faculty_id)}
                                className="text-slate-400 hover:text-rose-600 ml-1"
                                title="Remove assignment"
                              >
                                &times;
                              </button>
                            </span>
                          ))
                        )}
                        <button
                          onClick={() => openAssignModal(s)}
                          className="p-1 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Assign Faculty"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openSubModal(s)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Edit Subject"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Subject Modal */}
      <Modal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        title={editingSub ? `Edit Subject: ${editingSub.subject_code}` : 'Add New Subject'}
      >
        <form onSubmit={handleSaveSub} className="space-y-4">
          {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Subject Code
              </label>
              <input
                type="text"
                required
                value={subForm.subject_code}
                onChange={(e) => setSubForm({ ...subForm, subject_code: e.target.value })}
                placeholder="e.g. CS301"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Credits
              </label>
              <input
                type="number"
                min={1}
                max={10}
                required
                value={subForm.credits}
                onChange={(e) => setSubForm({ ...subForm, credits: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Subject Name
            </label>
            <input
              type="text"
              required
              value={subForm.subject_name}
              onChange={(e) => setSubForm({ ...subForm, subject_name: e.target.value })}
              placeholder="e.g. Design and Analysis of Algorithms"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Degree Program
              </label>
              <select
                value={subForm.course_id}
                onChange={(e) => setSubForm({ ...subForm, course_id: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              >
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.course_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Semester
              </label>
              <input
                type="number"
                min={1}
                max={12}
                required
                value={subForm.semester}
                onChange={(e) => setSubForm({ ...subForm, semester: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSubModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              {saving ? 'Saving...' : editingSub ? 'Update Subject' : 'Save Subject'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Faculty Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Assign Faculty: ${selectedSubForAssign?.subject_code}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveAssignment} className="space-y-4">
          {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{error}</div>}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Faculty
            </label>
            <select
              value={assignForm.faculty_id}
              onChange={(e) => setAssignForm({ ...assignForm, faculty_id: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              {facultyList.map((f) => (
                <option key={f.faculty_id} value={f.faculty_id}>
                  {f.user.full_name} ({f.department} - {f.designation})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_primary"
              checked={assignForm.is_primary_coordinator}
              onChange={(e) => setAssignForm({ ...assignForm, is_primary_coordinator: e.target.checked })}
              className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_primary" className="text-xs font-medium text-slate-700">
              Assign as Primary Subject Coordinator
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              {saving ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
