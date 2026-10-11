import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Clock, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, ShieldAlert, Send } from 'lucide-react';

export function ExamRoom() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [saveStatus, setSaveStatus] = useState('All saved');
  const [timeLeft, setTimeLeft] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Initialize Exam Session
  useEffect(() => {
    const initSession = async () => {
      try {
        const res = await api.post('/online-exam/start', { schedule_id: Number(scheduleId) });
        const data = res.data.data;
        setSession(data);
        setAnswers(data.saved_responses || {});
        setTabSwitches(data.tab_switches || 0);

        // Compute seconds until deadline
        const deadlineMs = new Date(data.deadline).getTime();
        const diffSeconds = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
        setTimeLeft(diffSeconds);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to start examination session.');
      } finally {
        setLoading(false);
      }
    };
    initSession();
  }, [scheduleId]);

  // Tab-switch monitoring (proctoring)
  useEffect(() => {
    if (!session || isSubmitted) return;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        try {
          await api.post('/online-exam/tab-switch', { attempt_id: session.attempt_id });
          setTabSwitches((prev) => prev + 1);
        } catch (err) {
          console.error(err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, isSubmitted]);

  // Server-side Countdown Timer
  useEffect(() => {
    if (timeLeft <= 0 || !session || isSubmitted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, session, isSubmitted]);

  const handleAutoSubmit = async () => {
    if (isSubmitted) return;
    setSubmitting(true);
    try {
      await api.post('/online-exam/submit', { attempt_id: session.attempt_id });
      setIsSubmitted(true);
    } catch (err) {
      console.error('Auto submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('/online-exam/submit', { attempt_id: session.attempt_id });
      setIsSubmitted(true);
      setIsSubmitDialogOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error submitting examination.');
    } finally {
      setSubmitting(false);
    }
  };

  // Answer change with incremental auto-save
  const handleAnswerChange = async (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setSaveStatus('Saving...');

    try {
      await api.post('/online-exam/save-answer', {
        attempt_id: session.attempt_id,
        question_id: questionId,
        student_answer: value,
      });
      setSaveStatus('All saved ✓');
    } catch (err) {
      setSaveStatus('Save error ⚠️');
    }
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm animate-pulse">
        Initializing secure proctored examination environment...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
          <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900">Examination Access Restricted</h2>
          <p className="text-xs text-slate-600 mt-2">{error}</p>
          <button
            onClick={() => navigate('/online-exam')}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
          >
            Return to Portal
          </button>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200 space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Examination Submitted Successfully</h2>
          <p className="text-xs text-slate-600">
            Your responses for <span className="font-bold">{session.subject.subject_name}</span> have been encrypted and stored in PostgreSQL.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl text-left text-xs text-slate-700 space-y-1">
            <p><span className="font-semibold">Attempt Reference:</span> #{session.attempt_id}</p>
            <p><span className="font-semibold">Questions Answered:</span> {Object.keys(answers).length} of {session.questions?.length}</p>
            <p><span className="font-semibold">Proctoring Events Logged:</span> {tabSwitches} tab switch(es)</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-xs"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQ = session.questions[currentIndex];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Proctoring Bar */}
      <header className="h-16 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 text-white font-black flex items-center justify-center text-xs">
            EMS
          </div>
          <div>
            <h2 className="text-xs font-bold text-white">{session.subject.subject_code} - {session.subject.subject_name}</h2>
            <span className="text-[10px] text-slate-400">Total Marks: {session.total_marks} | Status: Proctored</span>
          </div>
        </div>

        {/* Proctoring Warning Badge & Timer */}
        <div className="flex items-center gap-4">
          {tabSwitches > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>{tabSwitches} Tab Switch(es) Logged</span>
            </div>
          )}

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 font-mono font-bold text-sm text-blue-400">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>{formatTimer(timeLeft)}</span>
          </div>

          <button
            onClick={() => setIsSubmitDialogOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-900/40"
          >
            <Send className="w-3.5 h-3.5" />
            Submit
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Question Area */}
        <div className="flex-1 p-6 lg:p-10 overflow-y-auto flex flex-col justify-between max-w-4xl mx-auto w-full">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Question {currentIndex + 1} of {session.questions.length} ({currentQ.question_type})
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg">
                  {currentQ.marks} Marks
                </span>
                <span className="text-[11px] text-slate-400 font-mono">{saveStatus}</span>
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed mb-6">
              {currentQ.question_text}
            </h3>

            {/* Answer Input */}
            {currentQ.question_type === 'MCQ' ? (
              <div className="space-y-3">
                {currentQ.options?.map((opt, i) => {
                  const isSelected = answers[currentQ.question_id] === opt;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleAnswerChange(currentQ.question_id, opt)}
                      className={`w-full text-left p-4 rounded-xl border text-sm transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-500 text-white font-medium shadow-xs'
                          : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                <textarea
                  rows={6}
                  value={answers[currentQ.question_id] || ''}
                  onChange={(e) => handleAnswerChange(currentQ.question_id, e.target.value)}
                  placeholder="Type your response here..."
                  className="w-full p-4 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-800 mt-8">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={() => setCurrentIndex(Math.min(session.questions.length - 1, currentIndex + 1))}
              disabled={currentIndex === session.questions.length - 1}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Question Palette */}
        <aside className="w-72 bg-slate-950 border-l border-slate-800 p-5 hidden md:block overflow-y-auto">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Question Palette</h4>
          <div className="grid grid-cols-4 gap-2">
            {session.questions.map((q, idx) => {
              const isAnswered = Boolean(answers[q.question_id]);
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.question_id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-10 rounded-xl font-bold text-xs transition-all border ${
                    isCurrent
                      ? 'border-blue-400 bg-blue-600 text-white shadow-xs'
                      : isAnswered
                      ? 'border-emerald-700 bg-emerald-950/80 text-emerald-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800 text-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-emerald-900 border border-emerald-700" />
              <span className="text-slate-400">Answered ({Object.keys(answers).length})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-slate-900 border border-slate-800" />
              <span className="text-slate-400">Unanswered ({session.questions.length - Object.keys(answers).length})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-blue-600 border border-blue-400" />
              <span className="text-slate-400">Current Question</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Manual Submit Confirmation */}
      <ConfirmDialog
        isOpen={isSubmitDialogOpen}
        onClose={() => setIsSubmitDialogOpen(false)}
        onConfirm={handleManualSubmit}
        loading={submitting}
        title="Confirm Examination Submission"
        message={`Are you sure you want to finalize and submit your examination? You have answered ${Object.keys(answers).length} out of ${session.questions.length} questions. You will not be able to resume this session after submission.`}
        confirmText="Finalize & Submit"
        confirmVariant="primary"
      />
    </div>
  );
}
