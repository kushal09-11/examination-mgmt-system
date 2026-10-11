import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Badge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Search, Filter, Eye, UserX, CheckCircle, AlertTriangle } from 'lucide-react';

export function StudentsManagement() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');

  // Selected Student View Modal
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Deactivate dialog
  const [studentToDeactivate, setStudentToDeactivate] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const fetchStudents = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.append('search', search);
      if (courseFilter) params.append('course_id', courseFilter);
      if (batchFilter) params.append('batch_year', batchFilter);

      const res = await api.get(`/academic/students?${params.toString()}`);
      setStudents(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.get('/academic/courses');
        setCourses(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchStudents(1);
  }, [search, courseFilter, batchFilter]);

  const viewStudentDetails = async (studentId) => {
    setViewLoading(true);
    try {
      const res = await api.get(`/academic/students/${studentId}`);
      setSelectedStudent(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setViewLoading(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!studentToDeactivate) return;
    setDeactivating(true);
    try {
      await api.delete(`/academic/students/${studentToDeactivate.student_id}/deactivate`);
      setStudentToDeactivate(null);
      fetchStudents(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Error deactivating student');
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Student Directory & Academic Records</h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor enrolled student rosters, cumulative attendance percentages, and examination history
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 px-3 py-1.5 flex-1">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, enrollment no, or email..."
            className="w-full text-xs bg-transparent focus:outline-hidden text-slate-800"
          />
        </div>

        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
        >
          <option value="">All Degree Programs</option>
          {courses.map((c) => (
            <option key={c.course_id} value={c.course_id}>
              {c.course_name}
            </option>
          ))}
        </select>

        <select
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
        >
          <option value="">All Batch Years</option>
          <option value="2024">Batch 2024</option>
          <option value="2025">Batch 2025</option>
          <option value="2026">Batch 2026</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Enrollment No</th>
                <th className="px-6 py-3.5">Candidate Name</th>
                <th className="px-6 py-3.5">Program</th>
                <th className="px-6 py-3.5">Batch</th>
                <th className="px-6 py-3.5">Attendance</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-400">Loading student directory...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-400">No students matching the criteria.</td>
                </tr>
              ) : (
                students.map((s) => {
                  const att = Number(s.attendance_pct);
                  return (
                    <tr key={s.student_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-blue-700">{s.enrollment_no}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{s.user.full_name}</td>
                      <td className="px-6 py-4 text-slate-500">{s.course?.course_name}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{s.batch_year}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-xs ${
                            att >= 75
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {att.toFixed(1)}% {att >= 75 ? '✓' : '⚠️'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={s.is_active ? 'success' : 'default'}>
                          {s.is_active ? 'Active' : 'Deactivated'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => viewStudentDetails(s.student_id)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            title="View Academic History"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {s.is_active && (
                            <button
                              onClick={() => setStudentToDeactivate(s)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                              title="Soft Deactivate Student"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={fetchStudents}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
        />
      </div>

      {/* Student Details Modal */}
      <Modal
        isOpen={Boolean(selectedStudent)}
        onClose={() => setSelectedStudent(null)}
        title={`Student Profile: ${selectedStudent?.user?.full_name}`}
        maxWidth="max-w-3xl"
      >
        {selectedStudent && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Enrollment</span>
                <span className="font-bold text-slate-900 font-mono">{selectedStudent.enrollment_no}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Institutional ID</span>
                <span className="font-bold text-slate-900">{selectedStudent.user.institutional_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Attendance</span>
                <span className="font-bold text-slate-900">{Number(selectedStudent.attendance_pct).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Degree</span>
                <span className="font-bold text-slate-900">{selectedStudent.course.course_name}</span>
              </div>
            </div>

            {/* Results History */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Examination Results</h4>
              {selectedStudent.results?.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No published examination results on record.</p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-2.5">Subject</th>
                        <th className="p-2.5">Marks</th>
                        <th className="p-2.5">Grade</th>
                        <th className="p-2.5">Grade Point</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedStudent.results?.map((r) => (
                        <tr key={r.result_id}>
                          <td className="p-2.5 font-bold">{r.exam.subject.subject_name}</td>
                          <td className="p-2.5">{r.marks_obtained} / {r.max_marks}</td>
                          <td className="p-2.5 font-bold text-blue-700">{r.grade}</td>
                          <td className="p-2.5">{r.grade_points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Deactivation Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(studentToDeactivate)}
        onClose={() => setStudentToDeactivate(null)}
        onConfirm={confirmDeactivate}
        loading={deactivating}
        title="Deactivate Student Account"
        message={`Are you sure you want to soft-deactivate ${studentToDeactivate?.user?.full_name}? Per SRS compliance rules, this will disable active access while permanently preserving all past examination and grading records.`}
        confirmText="Deactivate"
        confirmVariant="danger"
      />
    </div>
  );
}
