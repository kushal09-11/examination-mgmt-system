import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Shield, Key, User, Settings as SettingsIcon, AlertCircle, CheckCircle } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMessage('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setStatusMessage('Password updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Account & System Settings</h1>
        <p className="text-sm text-slate-500">Manage your profile credentials and view institutional policy configurations</p>
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-200">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 text-sm rounded-lg border border-rose-200">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Info */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">User Profile</h2>
              <p className="text-xs text-slate-500">Personal and institutional identity</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</label>
              <p className="text-slate-800 font-medium mt-0.5">{user?.full_name}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</label>
              <p className="text-slate-800 font-medium mt-0.5">{user?.email}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</label>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-indigo-100 text-indigo-700">
                {user?.role}
              </span>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Status</label>
              <span className="inline-block ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">
                {user?.status || 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">Change Password</h2>
              <p className="text-xs text-slate-500">Enforce bcrypt salt work factor $\ge$ 12</p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">New Password</label>
              <input
                type="password"
                required
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2 px-4 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Institutional Policies & Governance Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">SRS v1.0 Governance & Examination Rules</h2>
            <p className="text-xs text-slate-500">Active institutional parameters enforced by the backend</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hall Ticket Threshold</h4>
            <p className="text-2xl font-bold text-slate-800 mt-1">75.0%</p>
            <p className="text-xs text-slate-500 mt-1">Students below this threshold are blocked from hall ticket download</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Failed Login Lockout</h4>
            <p className="text-2xl font-bold text-slate-800 mt-1">5 Attempts</p>
            <p className="text-xs text-slate-500 mt-1">Account locked automatically for 15 minutes after 5 consecutive failures</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GPA Formula</h4>
            <p className="text-sm font-bold text-slate-800 mt-2 font-mono">Σ(Credits × GP) / Σ(Credits)</p>
            <p className="text-xs text-slate-500 mt-1">Institutional weighted credit formula strictly computed</p>
          </div>
        </div>

        {/* Grading scale table */}
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Grading Matrix Reference</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-2">Score Percentage</th>
                  <th className="px-4 py-2">Letter Grade</th>
                  <th className="px-4 py-2">Grade Points (GP)</th>
                  <th className="px-4 py-2">Performance Qualifier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="px-4 py-2 font-mono">90.00% – 100.00%</td>
                  <td className="px-4 py-2 font-bold text-emerald-600">A+</td>
                  <td className="px-4 py-2 font-mono font-semibold">10.0</td>
                  <td className="px-4 py-2">Outstanding</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">80.00% – 89.99%</td>
                  <td className="px-4 py-2 font-bold text-emerald-500">A</td>
                  <td className="px-4 py-2 font-mono font-semibold">9.0</td>
                  <td className="px-4 py-2">Excellent</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">70.00% – 79.99%</td>
                  <td className="px-4 py-2 font-bold text-blue-600">B</td>
                  <td className="px-4 py-2 font-mono font-semibold">8.0</td>
                  <td className="px-4 py-2">Very Good</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">60.00% – 69.99%</td>
                  <td className="px-4 py-2 font-bold text-amber-600">C</td>
                  <td className="px-4 py-2 font-mono font-semibold">7.0</td>
                  <td className="px-4 py-2">Good</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">50.00% – 59.99%</td>
                  <td className="px-4 py-2 font-bold text-orange-600">D</td>
                  <td className="px-4 py-2 font-mono font-semibold">6.0</td>
                  <td className="px-4 py-2">Average (Minimum Pass)</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">&lt; 50.00%</td>
                  <td className="px-4 py-2 font-bold text-rose-600">F</td>
                  <td className="px-4 py-2 font-mono font-semibold">0.0</td>
                  <td className="px-4 py-2">Fail</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
