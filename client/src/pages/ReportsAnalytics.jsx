import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Download, FileSpreadsheet, Award, TrendingUp, Users, CheckCircle } from 'lucide-react';

export function ReportsAnalytics() {
  const [report, setReport] = useState(null);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [repRes, examRes] = await Promise.all([
        api.get(`/ops/reports/performance${selectedExamId ? `?exam_id=${selectedExamId}` : ''}`),
        api.get('/exams/exams'),
      ]);
      setReport(repRes.data.data);
      setExams(examRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedExamId]);

  const handleExportExcel = async () => {
    try {
      const res = await api.get(`/ops/reports/export-excel${selectedExamId ? `?exam_id=${selectedExamId}` : ''}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Academic_Performance_Report.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error exporting Excel report.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Academic Analytics & Institutional Reports</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time PostgreSQL analytics on pass percentages, grade distributions, and student merit rank lists
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export Spreadsheet (Excel)
        </button>
      </div>

      {/* Filter by Exam */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0">
          Target Examination:
        </label>
        <select
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
        >
          <option value="">All Published Examinations</option>
          {exams.map((ex) => (
            <option key={ex.exam_id} value={ex.exam_id}>
              {ex.subject?.subject_code} - {ex.subject?.subject_name} ({ex.exam_type})
            </option>
          ))}
        </select>
      </div>

      {/* Metrics Cards */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard title="Evaluated Candidates" value={report.totalEvaluated} icon={Users} color="blue" />
          <StatCard title="Overall Pass %" value={`${report.passPercentage}%`} icon={TrendingUp} color="emerald" />
          <StatCard title="Passed Candidates" value={report.passCount} icon={CheckCircle} color="indigo" />
          <StatCard title="Academic Shortfalls (F)" value={report.failCount} icon={Award} color="rose" />
        </div>
      )}

      {/* Chart & Summary */}
      {report && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1">Grade Distribution Analysis</h3>
          <p className="text-xs text-slate-500 mb-6">Aggregate candidate grade bands derived from active institutional grading policies</p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.gradeDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="grade" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#4338ca" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Student Rank List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Merit Rank Order</h3>
          <span className="text-xs text-slate-500">Sorted by marks obtained descending</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5 w-16">Rank</th>
                <th className="px-6 py-3.5">Candidate Name</th>
                <th className="px-6 py-3.5">Enrollment No</th>
                <th className="px-6 py-3.5">Degree Program</th>
                <th className="px-6 py-3.5">Subject</th>
                <th className="px-6 py-3.5">Marks Obtained</th>
                <th className="px-6 py-3.5">Grade</th>
                <th className="px-6 py-3.5">Grade Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-400">Loading rank list...</td>
                </tr>
              ) : report?.rankList?.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-400">No finalized records found for ranking.</td>
                </tr>
              ) : (
                report?.rankList?.map((r) => (
                  <tr key={r.rank} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                        r.rank === 1 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        r.rank === 2 ? 'bg-slate-200 text-slate-800' :
                        r.rank === 3 ? 'bg-amber-50 text-amber-700' : 'text-slate-600'
                      }`}>
                        #{r.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{r.student_name}</td>
                    <td className="px-6 py-4 font-mono text-slate-600">{r.enrollment_no}</td>
                    <td className="px-6 py-4 text-slate-500">{r.course}</td>
                    <td className="px-6 py-4 text-slate-700">{r.subject}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{r.marks} / {r.max_marks}</td>
                    <td className="px-6 py-4">
                      <Badge variant={r.grade === 'F' ? 'danger' : 'success'}>
                        {r.grade}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">{r.grade_points}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
