import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Badge';
import { Award, Download, CheckCircle2, TrendingUp, BookOpen } from 'lucide-react';

export function ResultsView() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    try {
      const res = await api.get('/eval/results?is_published=true');
      setResults(res.data.data);

      if (user.role === 'Student' && user.student) {
        const sumRes = await api.get(`/eval/results/student/${user.student.student_id}`);
        setSummary(sumRes.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [user]);

  const downloadGradeSheet = async (studentId) => {
    try {
      const res = await api.get(`/eval/results/student/${studentId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GradeSheet_${user?.student?.enrollment_no || 'Academic'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.message || 'Error downloading grade sheet PDF.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Official Academic Results & Grade Card</h1>
          <p className="text-xs text-slate-500 mt-1">
            Certified examination results, letter grades, grade points, and semester GPA / CGPA computation
          </p>
        </div>

        {user.role === 'Student' && user.student && summary && (
          <button
            onClick={() => downloadGradeSheet(user.student.student_id)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Official Grade Sheet (PDF)
          </button>
        )}
      </div>

      {/* Student GPA Banner */}
      {user.role === 'Student' && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Semester GPA</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-blue-700">{summary.gpa.toFixed(2)}</span>
              <span className="text-xs text-slate-500">/ 10.00</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Formula: Σ(Credits × Grade Points) / Σ(Credits)</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cumulative CGPA</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-indigo-700">{summary.cgpa.toFixed(2)}</span>
              <span className="text-xs text-slate-500">/ 10.00</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Weighted across completed academic terms</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Published Modules</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">{summary.results.length}</span>
              <span className="text-xs text-slate-500">Subjects Finalized</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">Verified by Controller of Exams</p>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Candidate</th>
                <th className="px-6 py-3.5">Enrollment No</th>
                <th className="px-6 py-3.5">Subject & Code</th>
                <th className="px-6 py-3.5">Credits</th>
                <th className="px-6 py-3.5">Marks Obtained</th>
                <th className="px-6 py-3.5">Letter Grade</th>
                <th className="px-6 py-3.5">Grade Points</th>
                <th className="px-6 py-3.5">Certification Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-400">Loading published results...</td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-400">No published results available yet.</td>
                </tr>
              ) : (
                results.map((r) => (
                  <tr key={r.result_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{r.student.user.full_name}</td>
                    <td className="px-6 py-4 font-mono text-slate-600">{r.student.enrollment_no}</td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-blue-700 mr-1.5">{r.exam.subject.subject_code}</span>
                      <span className="text-slate-800">{r.exam.subject.subject_name}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{r.exam.subject.credits}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {r.marks_obtained} / {r.max_marks}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-xs ${
                        r.grade === 'F' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}>
                        {r.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">{r.grade_points}</td>
                    <td className="px-6 py-4">
                      <Badge variant="success">Certified & Published</Badge>
                    </td>
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
