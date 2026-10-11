import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Pagination } from '../components/Pagination';
import { ShieldAlert, Search, Filter, Clock, User } from 'lucide-react';

export function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [actionSearch, setActionSearch] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (actionSearch) params.append('action', actionSearch);
      if (resourceFilter) params.append('affected_resource', resourceFilter);

      const res = await api.get(`/ops/audit-logs?${params.toString()}`);
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [actionSearch, resourceFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Security & Operational Audit Logs</h1>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-resistant append-only ledger tracking all authentication, scheduling, eligibility, and grading changes
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
          <ShieldAlert className="w-4 h-4 text-emerald-600" />
          <span>Append-Only Retention Policy (≥ 12 Months)</span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 px-3 py-1.5 flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={actionSearch}
            onChange={(e) => setActionSearch(e.target.value)}
            placeholder="Search action keyword (e.g. LOGIN, SCHEDULE, RESULT)..."
            className="w-full text-xs bg-transparent focus:outline-hidden text-slate-800"
          />
        </div>

        <select
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
        >
          <option value="">All Resources</option>
          <option value="USER">USER</option>
          <option value="EXAM_SCHEDULE">EXAM_SCHEDULE</option>
          <option value="HALL_TICKET">HALL_TICKET</option>
          <option value="QUESTION">QUESTION</option>
          <option value="QUESTION_PAPER">QUESTION_PAPER</option>
          <option value="EXAM_ATTEMPT">EXAM_ATTEMPT</option>
          <option value="RESULT">RESULT</option>
          <option value="ATTENDANCE">ATTENDANCE</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Action Event</th>
                <th className="px-6 py-3.5">Actor / Operator</th>
                <th className="px-6 py-3.5">Target Resource</th>
                <th className="px-6 py-3.5">Resource ID</th>
                <th className="px-6 py-3.5">Audit Metadata</th>
                <th className="px-6 py-3.5">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-400 font-sans">Loading audit trail...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-400 font-sans">No audit records found.</td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.log_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-900 font-sans">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        l.action.includes('LOCK') || l.action.includes('REJECT')
                          ? 'bg-rose-100 text-rose-800'
                          : l.action.includes('PUBLISH') || l.action.includes('SUCCESS')
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-sans font-medium text-slate-800">
                      {l.user ? `${l.user.full_name} (${l.user.role})` : 'System Daemon'}
                    </td>
                    <td className="px-6 py-3.5 text-blue-700 font-semibold">{l.affected_resource || 'N/A'}</td>
                    <td className="px-6 py-3.5 text-slate-600">{l.resource_id || '—'}</td>
                    <td className="px-6 py-3.5 max-w-xs truncate text-[11px] text-slate-500" title={JSON.stringify(l.metadata)}>
                      {l.metadata ? JSON.stringify(l.metadata) : '—'}
                    </td>
                    <td className="px-6 py-3.5 text-slate-400">{l.ip_address || '127.0.0.1'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={fetchLogs}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
        />
      </div>
    </div>
  );
}
