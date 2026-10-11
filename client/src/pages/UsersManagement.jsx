import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { UserPlus, Search, Shield, User, Mail, Phone, Hash } from 'lucide-react';

export function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: 'Student',
    password: 'TemporaryPassword123!',
    contact_number: '',
    institutional_id: '',
    // Role specific
    course_id: '',
    batch_year: 2024,
    attendance_pct: 85.0,
    department: 'Computer Science',
    designation: 'Assistant Professor',
  });

  const fetchData = async () => {
    try {
      const [studRes, facRes, coursesRes] = await Promise.all([
        api.get('/academic/students?limit=100'),
        api.get('/academic/faculty'),
        api.get('/academic/courses'),
      ]);
      setCourses(coursesRes.data.data);
      if (coursesRes.data.data.length > 0) {
        setForm((prev) => ({ ...prev, course_id: coursesRes.data.data[0].course_id }));
      }

      // Aggregate users
      const studentUsers = (studRes.data.data || []).map((s) => ({
        ...s.user,
        studentProfile: s,
        role: 'Student',
      }));
      const facultyUsers = (facRes.data.data || []).map((f) => ({
        ...f.user,
        facultyProfile: f,
        role: 'Faculty',
      }));

      // Deduplicate
      const userMap = new Map();
      studentUsers.forEach((u) => userMap.set(u.user_id, u));
      facultyUsers.forEach((u) => userMap.set(u.user_id, u));
      setUsers(Array.from(userMap.values()));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        role: form.role,
        password: form.password,
        contact_number: form.contact_number.trim(),
        institutional_id: form.institutional_id.trim(),
      };

      if (form.role === 'Student') {
        payload.course_id = Number(form.course_id);
        payload.batch_year = Number(form.batch_year);
        payload.attendance_pct = Number(form.attendance_pct);
      } else if (form.role === 'Faculty') {
        payload.department = form.department.trim();
        payload.designation = form.designation.trim();
      }

      await api.post('/auth/register', payload);
      setSuccess(`Account registered successfully for ${form.full_name}!`);
      setTimeout(() => {
        setIsModalOpen(false);
        fetchData();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register account.');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.institutional_id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">User Account Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Register Student, Faculty, and Examiner accounts with institutional authentication
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Register New Account
        </button>
      </div>

      <div className="flex items-center bg-white rounded-xl border border-slate-200 px-3 py-2 shadow-xs max-w-md">
        <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, institutional ID, or email..."
          className="w-full text-xs bg-transparent focus:outline-hidden text-slate-800 placeholder-slate-400"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">Institutional ID</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Contact Email</th>
                <th className="px-6 py-3.5">Department / Course</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400">Loading accounts...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.user_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{u.full_name}</td>
                    <td className="px-6 py-4 font-mono text-slate-600">{u.institutional_id || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <Badge variant={u.role === 'Admin' ? 'danger' : u.role === 'Faculty' ? 'purple' : u.role === 'Examiner' ? 'warning' : 'success'}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{u.email}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {u.studentProfile ? (
                        <span>{u.studentProfile.course?.course_name} (Batch {u.studentProfile.batch_year})</span>
                      ) : u.facultyProfile ? (
                        <span>{u.facultyProfile.department} ({u.facultyProfile.designation})</span>
                      ) : (
                        'Central Administration'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={u.status === 'active' ? 'success' : u.status === 'locked' ? 'danger' : 'default'}>
                        {u.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Institutional Account">
        <form onSubmit={handleRegister} className="space-y-4">
          {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{error}</div>}
          {success && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">{success}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Dr. Jane Doe"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Institutional ID
              </label>
              <input
                type="text"
                required
                value={form.institutional_id}
                onChange={(e) => setForm({ ...form, institutional_id: e.target.value })}
                placeholder="STU-2026-042 or FAC-CS-012"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@ems.edu"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Account Role
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Student">Student</option>
                <option value="Faculty">Faculty</option>
                <option value="Examiner">Examiner</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Initial Password
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contact Number
              </label>
              <input
                type="text"
                value={form.contact_number}
                onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                placeholder="+1-555-0199"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Student Specific Fields */}
          {form.role === 'Student' && (
            <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 space-y-3">
              <h4 className="text-xs font-bold text-blue-900 uppercase">Student Academic Profile</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Degree Program</label>
                  <select
                    value={form.course_id}
                    onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  >
                    {courses.map((c) => (
                      <option key={c.course_id} value={c.course_id}>
                        {c.course_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Batch Year</label>
                  <input
                    type="number"
                    min={2020}
                    max={2030}
                    value={form.batch_year}
                    onChange={(e) => setForm({ ...form, batch_year: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Faculty Specific Fields */}
          {form.role === 'Faculty' && (
            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-3">
              <h4 className="text-xs font-bold text-indigo-900 uppercase">Faculty Department Profile</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              {saving ? 'Registering...' : 'Register User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
