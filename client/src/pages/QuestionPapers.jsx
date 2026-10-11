import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { FileText, CheckCircle2, XCircle, Eye, MessageSquare } from 'lucide-react';

export function QuestionPapers() {
  const { user } = useAuth();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review Modal
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState('Approved');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  // View Paper Modal
  const [viewingPaper, setViewingPaper] = useState(null);

  const fetchPapers = async () => {
    try {
      const res = await api.get('/bank/papers');
      setPapers(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  const openReviewModal = (paper) => {
    setSelectedPaper(paper);
    setReviewStatus('Approved');
    setFeedback(paper.examiner_feedback || '');
    setIsReviewModalOpen(true);
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/bank/papers/${selectedPaper.paper_id}/review`, {
        status: reviewStatus,
        examiner_feedback: feedback.trim(),
      });
      setIsReviewModalOpen(false);
      fetchPapers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error submitting review.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Generated Question Papers & Moderation</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review generated examination papers, verify blueprint distribution, and approve for final publication
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-44 bg-slate-200 rounded-2xl animate-pulse" />)
        ) : papers.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            No question papers generated yet.
          </div>
        ) : (
          papers.map((p) => (
            <div key={p.paper_id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    {p.subject?.subject_code}
                  </span>
                  <Badge variant={p.status === 'Approved' ? 'success' : p.status === 'Rejected' ? 'danger' : 'warning'}>
                    {p.status}
                  </Badge>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">{p.title}</h3>
                <p className="text-xs text-slate-500 mt-1">Version {p.version} • {p.total_marks} Total Marks</p>

                {p.examiner_feedback && (
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800 text-[11px] mb-0.5 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-slate-400" />
                      Examiner Remarks:
                    </p>
                    {p.examiner_feedback}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setViewingPaper(p)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Questions ({p.items?.length || 0})
                </button>

                {(user.role === 'Examiner' || user.role === 'Admin') && (
                  <button
                    onClick={() => openReviewModal(p)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors"
                  >
                    Review Paper
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review Modal */}
      <Modal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} title={`Review Paper: ${selectedPaper?.title}`}>
        <form onSubmit={handleSaveReview} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Review Determination
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReviewStatus('Approved')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  reviewStatus === 'Approved'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Approve for Exam
              </button>
              <button
                type="button"
                onClick={() => setReviewStatus('Rejected')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  reviewStatus === 'Rejected'
                    ? 'bg-rose-50 border-rose-400 text-rose-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                Reject / Revision Needed
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Examiner Feedback / Audit Comments
            </label>
            <textarea
              rows={3}
              required
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="State rationale, syllabus compliance, and question distribution review..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsReviewModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              {saving ? 'Submitting Review...' : 'Certify Review'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Questions In Paper Modal */}
      <Modal isOpen={Boolean(viewingPaper)} onClose={() => setViewingPaper(null)} title={`Questions: ${viewingPaper?.title}`} maxWidth="max-w-3xl">
        {viewingPaper && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">{viewingPaper.subject?.subject_code} - {viewingPaper.subject?.subject_name}</span>
              <span className="font-bold text-blue-700">{viewingPaper.total_marks} Total Marks</span>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {viewingPaper.items?.map((it, idx) => (
                <div key={it.id} className="p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-800">Question {idx + 1} ({it.question.question_type})</span>
                    <span className="font-bold text-blue-700">{it.marks} Marks</span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1">{it.question.question_text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
