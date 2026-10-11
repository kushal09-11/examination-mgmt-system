import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { CheckCircle2, XCircle, Globe, Award, Edit3, MessageSquare } from 'lucide-react';

export function Moderation() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [loading, setLoading] = useState(true);

  // Moderation Modal
  const [selectedResult, setSelectedResult] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modStatus, setModStatus] = useState('Approved');
  const [adjustedMarks, setAdjustedMarks] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resRes, examRes] = await Promise.all([
        api.get(`/eval/results${selectedExamId ? `?exam_id=${selectedExamId}` : ''}`),
        api.get('/exams/exams'),
      ]);
      setResults(resRes.data.data);
      setExams(examRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedExamId]);

  const openModerateModal = (r) => {
    setSelectedResult(r);
    setModStatus('Approved');
    setAdjustedMarks(String(r.marks_obtained));
    setRemarks(r.remarks || '');
    setIsModalOpen(true);
  };

  const handleSaveModeration = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/eval/results/moderate', {
        result_id: selectedResult.result_id,
        moderation_status: modStatus,
        adjusted_marks: Number(adjustedMarks),
        remarks: remarks.trim(),
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error submitting moderation.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (examId, isPublished) => {
    setPublishing(true);
    setMessage('');
    try {
      await api.put(`/eval/results/publish/${examId}`, { is_published: isPublished });
      setMessage(`Results for this examination have been ${isPublished ? 'officially published to student portals' : 'withdrawn'}.`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating publication status.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Marks Moderation & Result Publication</h1>
          <p className="text-xs text-slate-500 mt-1">
            Examiner certification workflow: audit marks entries, calibrate boundaries, and publish finalized results
          </p>
        </div>

        {selectedExamId && user.role === 'Admin' && (
          <button
            onClick={() => handleTogglePublish(selectedExamId, true)}
            disabled={publishing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
          >
            <Globe className="w-4 h-4" />
            {publishing ? 'Publishing...' : 'Publish Approved Results'}
          </button>
        )}
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Filter by exam */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0">
          Filter Examination:
        </label>
        <select
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
        >
          <option value="">All Examinations</option>
          {exams.map((ex) => (
            <option key={ex.exam_id} value={ex.exam_id}>
              {ex.subject?.subject_code} - {ex.subject?.subject_name} ({ex.exam_type})
            </option>
          ))}
        </select>
      </div>

      {/* Results moderation table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Candidate</th>
                <th className="px-6 py-3.5">Enrollment No</th>
                <th className="px-6 py-3.5">Subject</th>
                <th className="px-6 py-3.5">Marks Obtained</th>
                <th className="px-6 py-3.5">Grade</th>
                <th className="px-6 py-3.5">Moderation Status</th>
                <th className="px-6 py-3.5">Publication</th>
                <th className="px-6 py-3.5 text-right">Moderator Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-400">Loading results...</td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-400">No marks submitted for moderation.</td>
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
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {r.marks_obtained} / {r.max_marks}
                    </td>
                    <td className="px-6 py-4 font-bold text-blue-700">
                      {r.grade} ({r.grade_points} pts)
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={r.moderation_status === 'Approved' ? 'success' : r.moderation_status === 'Rejected' ? 'danger' : 'warning'}>
                        {r.moderation_status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={r.is_published ? 'primary' : 'default'}>
                        {r.is_published ? 'Published' : 'Hidden'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openModerateModal(r)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Moderate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Moderation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Moderate Marks: ${selectedResult?.student?.user?.full_name}`}
      >
        {selectedResult && (
          <form onSubmit={handleSaveModeration} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between">
              <span>{selectedResult.exam.subject.subject_name}</span>
              <span className="font-bold">Max Marks: {selectedResult.max_marks}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Calibrated / Adjusted Marks
              </label>
              <input
                type="number"
                min={0}
                max={Number(selectedResult.max_marks)}
                step="0.5"
                required
                value={adjustedMarks}
                onChange={(e) => setAdjustedMarks(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Moderation Determination
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setModStatus('Approved')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    modStatus === 'Approved'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Approve Marks
                </button>
                <button
                  type="button"
                  onClick={() => setModStatus('Rejected')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    modStatus === 'Rejected'
                      ? 'bg-rose-50 border-rose-400 text-rose-800'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Reject Entry
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Examiner Moderation Remarks
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="State adjustments or audit reasons..."
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>

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
                {saving ? 'Updating...' : 'Save Moderation'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
