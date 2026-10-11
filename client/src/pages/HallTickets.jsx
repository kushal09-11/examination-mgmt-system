import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import {
  Ticket,
  Download,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  School,
  FileText,
  Clock,
  MapPin,
  XCircle,
} from 'lucide-react';

export function HallTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const [tickRes, schedRes] = await Promise.all([
        api.get('/hall-tickets'),
        user?.role === 'Admin' ? api.get('/exams/schedules') : Promise.resolve({ data: { data: [] } }),
      ]);
      setTickets(tickRes?.data?.data || []);
      const schedList = schedRes?.data?.data || [];
      setSchedules(schedList);
      if (schedList.length > 0 && !selectedScheduleId) {
        setSelectedScheduleId(schedList[0].schedule_id);
      }
    } catch (err) {
      console.error('Error fetching hall tickets:', err);
      setError(err.response?.data?.message || 'Failed to load hall tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const handleBatchGenerate = async (e) => {
    e.preventDefault();
    if (!selectedScheduleId) {
      setError('Please select an examination session.');
      return;
    }
    setGenerating(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.post('/hall-tickets/batch-generate', {
        schedule_id: Number(selectedScheduleId),
      });
      setSuccessMsg(res.data?.message || 'Batch hall tickets processed successfully.');
      setIsBatchModalOpen(false);
      fetchTickets();
    } catch (err) {
      setError(err.response?.data?.message || 'Error processing batch hall tickets.');
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = async (ticket) => {
    try {
      const response = await api.get(`/hall-tickets/${ticket.hallticket_id}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CBIT_HallTicket_${ticket.ticket_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to download hall ticket PDF.');
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const studentName = t.student?.user?.full_name?.toLowerCase() || '';
    const enrollment = t.student?.enrollment_no?.toLowerCase() || '';
    const ticketNo = t.ticket_number?.toLowerCase() || '';
    const subject = t.schedule?.exam?.subject?.subject_name?.toLowerCase() || '';
    const code = t.schedule?.exam?.subject?.subject_code?.toLowerCase() || '';
    return studentName.includes(q) || enrollment.includes(q) || ticketNo.includes(q) || subject.includes(q) || code.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* College Institutional Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-200 border border-blue-400/30">
                Examination Cell
              </span>
              <span className="text-xs text-blue-200/80">Autonomous • Affiliated to OU</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Chaitanya Bharathi Institute of Technology, Gandipet
            </h1>
            <p className="text-xs text-blue-100/80 mt-1 max-w-2xl">
              Official Examination Hall Tickets & Admit Cards — Admittance strictly regulated by the mandatory 75% attendance threshold.
            </p>
          </div>

          {user?.role === 'Admin' && (
            <button
              onClick={() => { setError(''); setSuccessMsg(''); setIsBatchModalOpen(true); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              Process Batch Hall Tickets
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-800 text-xs font-semibold rounded-xl border border-rose-200">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Student Specific Notice Card */}
      {user?.role === 'Student' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-indigo-600" />
            Admit Card Instructions for Candidates
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-semibold block text-slate-800">1. Verification</span>
              Admit cards are validated against minimum 75.0% cumulative attendance.
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-semibold block text-slate-800">2. Examination Entry</span>
              Must carry a printed copy of the signed hall ticket along with college identity card.
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-semibold block text-slate-800">3. Examination Hall</span>
              Report to the designated examination venue at least 15 minutes before session commencement.
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate, roll no, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{filteredTickets.length}</span> hall ticket(s)
        </div>
      </div>

      {/* Hall Tickets Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Ticket ID</th>
                <th className="px-5 py-3.5">Candidate Details</th>
                <th className="px-5 py-3.5">Subject</th>
                <th className="px-5 py-3.5">Date & Session</th>
                <th className="px-5 py-3.5">Venue</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">Loading hall tickets from database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    <Ticket className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">No hall tickets found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {user?.role === 'Admin'
                        ? 'Click "Process Batch Hall Tickets" above to generate admit cards for a scheduled exam.'
                        : 'No official hall tickets have been generated for your enrolled courses yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => {
                  const isEligible = t.eligibility_status === 'Eligible' && t.is_approved;
                  return (
                    <tr key={t.hallticket_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-slate-800 text-[11px]">
                        {t.ticket_number}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-900 block">{t.student?.user?.full_name || 'N/A'}</span>
                        <span className="font-mono text-[11px] text-slate-500">{t.student?.enrollment_no || 'N/A'}</span>
                        {t.student?.attendance_pct && (
                          <span className="text-[10px] text-slate-400 block">
                            Attendance: {Number(t.student.attendance_pct).toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-blue-700 mr-1.5">
                          {t.schedule?.exam?.subject?.subject_code}
                        </span>
                        <span className="font-medium text-slate-800">
                          {t.schedule?.exam?.subject?.subject_name}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-semibold block text-slate-800">
                          {t.schedule?.exam_date ? new Date(t.schedule.exam_date).toLocaleDateString() : 'TBD'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {t.schedule?.start_time} - {t.schedule?.end_time}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 font-medium">
                        {t.schedule?.venue || 'Campus Examination Hall'}
                      </td>
                      <td className="px-5 py-4">
                        {isEligible ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Eligible & Issued
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              Ineligible
                            </span>
                            {t.rejection_reason && (
                              <span className="block text-[10px] text-rose-600 mt-1 max-w-xs">
                                {t.rejection_reason}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {isEligible ? (
                          <button
                            onClick={() => downloadPDF(t)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download PDF
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            Admit Restricted
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Generation Modal */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="Batch Hall Ticket Generation & Eligibility Check"
      >
        <form onSubmit={handleBatchGenerate} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 leading-relaxed">
            <p className="font-bold mb-1 flex items-center gap-1.5">
              <School className="w-4 h-4 text-blue-700" />
              CBIT Mandatory Attendance Policy (75.0% Minimum):
            </p>
            This automated engine will scan all candidates registered for the selected examination. Eligible candidates (attendance ≥ 75.0%) will receive official admit tickets with PDF download authorization. Ineligible candidates will be logged with attendance shortage reasons.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Examination Session
            </label>
            {schedules.length === 0 ? (
              <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                No examination schedules found. Please create and publish an exam schedule first in the Exam Scheduling tab.
              </p>
            ) : (
              <select
                value={selectedScheduleId}
                onChange={(e) => setSelectedScheduleId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              >
                {schedules.map((sch) => (
                  <option key={sch.schedule_id} value={sch.schedule_id}>
                    {sch.exam?.subject?.subject_code} - {sch.exam?.subject?.subject_name} ({sch.venue}) on {new Date(sch.exam_date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBatchModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generating || schedules.length === 0}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50"
            >
              {generating ? 'Processing Roster...' : 'Verify & Generate Tickets'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
