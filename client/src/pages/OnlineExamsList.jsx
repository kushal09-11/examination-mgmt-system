import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useNavigate } from 'react-router-dom';
import { Laptop, Clock, AlertTriangle, Play, CheckCircle2, ShieldCheck } from 'lucide-react';

export function OnlineExamsList() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);
  const navigate = useNavigate();

  const fetchExams = async () => {
    try {
      const res = await api.get('/online-exam/available');
      setExams(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleStartExam = (scheduleId) => {
    navigate(`/exam-room/${scheduleId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Online Examination Portal</h1>
        <p className="text-xs text-slate-500 mt-1">
          Access timed online computer-based examinations with proctored session integrity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          [1, 2].map((i) => <div key={i} className="h-48 bg-slate-200 rounded-2xl animate-pulse" />)
        ) : exams.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            No active online examinations scheduled for your course and batch at this time.
          </div>
        ) : (
          exams.map((ex) => {
            const isCompleted = ['Submitted', 'AutoSubmitted', 'UnderEvaluation', 'Evaluated'].includes(ex.attempt_status);
            const canAttempt = ex.is_eligible && !isCompleted;

            return (
              <div key={ex.schedule_id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      {ex.subject_code}
                    </span>
                    <Badge variant={ex.is_eligible ? 'success' : 'danger'}>
                      {ex.is_eligible ? 'Eligible' : 'Ineligible'}
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">{ex.subject_name}</h3>
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      Duration: {ex.duration_minutes} Mins
                    </span>
                    <span className="font-bold text-slate-900">
                      Total: {ex.total_marks} Marks
                    </span>
                    <span className="col-span-2 text-slate-500">
                      Session Date: {new Date(ex.exam_date).toLocaleDateString()} ({ex.start_time} - {ex.end_time})
                    </span>
                  </div>

                  {ex.hall_ticket_number && (
                    <p className="text-[11px] font-mono text-slate-500 mt-2">
                      Admit Ticket: {ex.hall_ticket_number}
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Submitted ({ex.attempt_status})
                    </span>
                  ) : ex.is_eligible ? (
                    <button
                      onClick={() => setSelectedExam(ex)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Begin Examination
                    </button>
                  ) : (
                    <span className="text-xs text-rose-600 font-medium">
                      Attendance threshold not met for hall ticket.
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation & Instructions Modal */}
      <Modal isOpen={Boolean(selectedExam)} onClose={() => setSelectedExam(null)} title="Examination Instructions & Proctoring Notice">
        {selectedExam && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-900 space-y-2">
              <h4 className="font-bold uppercase text-[11px] text-blue-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Examination Honor Code & Integrity Guidelines:
              </h4>
              <ul className="list-disc pl-4 space-y-1">
                <li>Server-Side Timing: The countdown timer is verified on the backend. Responses are automatically locked at the deadline.</li>
                <li>Incremental Auto-Save: Answers are saved instantly as you progress. Refreshing the browser will resume your session.</li>
                <li>Proctoring Monitoring: Switching tabs or navigating outside the browser window is recorded in the official audit log.</li>
              </ul>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
              <p><span className="font-bold">Subject:</span> {selectedExam.subject_code} - {selectedExam.subject_name}</p>
              <p><span className="font-bold">Duration:</span> {selectedExam.duration_minutes} Minutes ({selectedExam.total_marks} Marks)</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedExam(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStartExam(selectedExam.schedule_id)}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
              >
                I Agree — Start Examination
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
