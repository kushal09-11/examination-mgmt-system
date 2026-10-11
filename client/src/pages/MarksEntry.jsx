import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Badge';
import { Award, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

export function MarksEntry() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [students, setStudents] = useState([]);
  const [marksMap, setMarksMap] = useState({});
  const [remarksMap, setRemarksMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchExams = async () => {
    try {
      const res = await api.get('/exams/exams');
      setExams(res.data.data);
      if (res.data.data.length > 0) {
        setSelectedExamId(res.data.data[0].exam_id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (!selectedExamId) return;

    const loadStudentsAndExistingResults = async () => {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const exam = exams.find((e) => e.exam_id === Number(selectedExamId));
        const courseId = exam?.subject?.course_id;

        const [studRes, resRes] = await Promise.all([
          api.get(`/academic/students?limit=100${courseId ? `&course_id=${courseId}` : ''}`),
          api.get(`/eval/results?exam_id=${selectedExamId}`),
        ]);

        const roster = studRes.data.data || [];
        setStudents(roster);

        const marks = {};
        const remarks = {};
        resRes.data.data.forEach((r) => {
          marks[r.student_id] = Number(r.marks_obtained);
          remarks[r.student_id] = r.remarks || '';
        });

        setMarksMap(marks);
        setRemarksMap(remarks);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadStudentsAndExistingResults();
  }, [selectedExamId, exams]);

  const selectedExam = exams.find((e) => e.exam_id === Number(selectedExamId));

  const handleSaveMarks = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const marks_list = [];

      for (const s of students) {
        const val = marksMap[s.student_id];
        if (val !== undefined && val !== '') {
          const numVal = Number(val);
          if (numVal < 0) {
            throw new Error(`Marks for ${s.user.full_name} cannot be negative.`);
          }
          if (selectedExam && numVal > selectedExam.total_marks) {
            throw new Error(`Marks for ${s.user.full_name} (${numVal}) cannot exceed maximum marks (${selectedExam.total_marks}).`);
          }
          marks_list.push({
            student_id: s.student_id,
            marks_obtained: numVal,
            remarks: remarksMap[s.student_id] || null,
          });
        }
      }

      if (marks_list.length === 0) {
        throw new Error('Please enter marks for at least one candidate.');
      }

      await api.post('/eval/marks', {
        exam_id: Number(selectedExamId),
        marks_list,
      });

      setSuccess(`Marks recorded for ${marks_list.length} candidate(s) and submitted for Examiner moderation.`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Marks Entry & Evaluation</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enter verified marks obtained by candidates. Records remain pending until approved by the Examiner.
          </p>
        </div>

        <button
          onClick={handleSaveMarks}
          disabled={saving || students.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Submitting...' : 'Submit for Moderation'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Select Exam */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0">
            Select Examination:
          </label>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
          >
            {exams.map((ex) => (
              <option key={ex.exam_id} value={ex.exam_id}>
                {ex.subject?.subject_code} - {ex.subject?.subject_name} ({ex.exam_type}) | Max: {ex.total_marks} Marks
              </option>
            ))}
          </select>
        </div>

        {selectedExam && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500">Maximum Marks:</span>
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
              {selectedExam.total_marks}
            </span>
          </div>
        )}
      </div>

      {/* Marks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Enrollment No</th>
                <th className="px-6 py-3.5">Candidate Name</th>
                <th className="px-6 py-3.5">Program</th>
                <th className="px-6 py-3.5 w-32">Marks Obtained</th>
                <th className="px-6 py-3.5">Percentage Preview</th>
                <th className="px-6 py-3.5">Evaluator Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400">Loading student list...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400">No students enrolled in this course.</td>
                </tr>
              ) : (
                students.map((s) => {
                  const currentMarks = marksMap[s.student_id];
                  const maxM = selectedExam?.total_marks || 100;
                  const pct = currentMarks !== undefined && currentMarks !== '' ? (Number(currentMarks) / maxM) * 100 : null;

                  return (
                    <tr key={s.student_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-blue-700">{s.enrollment_no}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{s.user.full_name}</td>
                      <td className="px-6 py-4 text-slate-500">{s.course?.course_name}</td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min={0}
                          max={maxM}
                          step="0.5"
                          value={currentMarks !== undefined ? currentMarks : ''}
                          onChange={(e) => setMarksMap({ ...marksMap, [s.student_id]: e.target.value })}
                          placeholder={`0 - ${maxM}`}
                          className={`w-24 px-2.5 py-1.5 text-xs font-bold rounded-lg border focus:outline-hidden ${
                            currentMarks > maxM
                              ? 'border-rose-400 bg-rose-50 text-rose-700'
                              : 'border-slate-200 bg-white text-slate-900 focus:border-blue-500'
                          }`}
                        />
                      </td>
                      <td className="px-6 py-4">
                        {pct !== null ? (
                          <span className={`font-semibold ${pct >= 40 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {pct.toFixed(1)}% {pct >= 40 ? '(Pass)' : '(Fail)'}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not entered</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={remarksMap[s.student_id] || ''}
                          onChange={(e) => setRemarksMap({ ...remarksMap, [s.student_id]: e.target.value })}
                          placeholder="Optional comments..."
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                        />
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
