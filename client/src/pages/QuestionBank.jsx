import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { FileQuestion, Plus, Wand2, Search, Filter, BookOpen } from 'lucide-react';

export function QuestionBank() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // New Question Modal
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [qForm, setQForm] = useState({
    subject_id: '',
    question_text: '',
    question_type: 'MCQ',
    difficulty: 'Medium',
    marks: 2,
    unit: 1,
    tags: '',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
  });

  // Automated Paper Generator Modal
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [genForm, setGenForm] = useState({
    subject_id: '',
    title: '',
    total_marks: 50,
  });

  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [genSuccess, setGenSuccess] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [qRes, subRes] = await Promise.all([
        api.get('/bank/questions'),
        api.get('/academic/subjects'),
      ]);
      setQuestions(qRes.data.data);
      setSubjects(subRes.data.data);

      if (subRes.data.data.length > 0) {
        setQForm((prev) => ({ ...prev, subject_id: subRes.data.data[0].subject_id }));
        setGenForm((prev) => ({ ...prev, subject_id: subRes.data.data[0].subject_id, title: `${subRes.data.data[0].subject_code} Mid-Term Paper` }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        subject_id: Number(qForm.subject_id),
        question_text: qForm.question_text.trim(),
        question_type: qForm.question_type,
        difficulty: qForm.difficulty,
        marks: Number(qForm.marks),
        unit: Number(qForm.unit),
        tags: qForm.tags.trim() || null,
        correct_answer: qForm.correct_answer.trim(),
        explanation: qForm.explanation.trim() || null,
        options: qForm.question_type === 'MCQ' ? qForm.options.filter((o) => o.trim()) : null,
      };

      await api.post('/bank/questions', payload);
      setIsQuestionModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving question.');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePaper = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setError('');
    setGenSuccess('');
    try {
      const res = await api.post('/bank/papers/generate', {
        subject_id: Number(genForm.subject_id),
        title: genForm.title.trim(),
        total_marks: Number(genForm.total_marks),
      });
      setGenSuccess('Question paper generated successfully and submitted for Examiner review!');
      setTimeout(() => {
        setIsGeneratorModalOpen(false);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate paper. Check question pool size.');
    } finally {
      setGenerating(false);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesSubject = !selectedSubjectId || q.subject_id === Number(selectedSubjectId);
    const matchesDiff = !selectedDifficulty || q.difficulty === selectedDifficulty;
    const matchesType = !selectedType || q.question_type === selectedType;
    return matchesSubject && matchesDiff && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Question Bank & Blueprint Repository</h1>
          <p className="text-xs text-slate-500 mt-1">
            Author and categorize questions by difficulty, unit, and taxonomy. Generate balanced exam papers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => { setError(''); setGenSuccess(''); setIsGeneratorModalOpen(true); }}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Wand2 className="w-4 h-4 text-indigo-600" />
            Auto Generate Paper
          </button>
          <button
            onClick={() => { setError(''); setIsQuestionModalOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Author Question
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <select
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
        >
          <option value="">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.subject_id} value={s.subject_id}>
              {s.subject_code} - {s.subject_name}
            </option>
          ))}
        </select>

        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
        >
          <option value="">All Difficulty Levels</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
        >
          <option value="">All Question Types</option>
          <option value="MCQ">Multiple Choice (MCQ)</option>
          <option value="ShortAnswer">Short Answer</option>
          <option value="Essay">Essay / Descriptive</option>
        </select>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-28 bg-slate-200 rounded-2xl animate-pulse" />)
        ) : filteredQuestions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            No questions matching criteria. Author questions to populate the pool.
          </div>
        ) : (
          filteredQuestions.map((q) => (
            <div key={q.question_id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                    {q.subject?.subject_code}
                  </span>
                  <Badge variant={q.difficulty === 'Hard' ? 'danger' : q.difficulty === 'Medium' ? 'warning' : 'success'}>
                    {q.difficulty}
                  </Badge>
                  <Badge variant="default">Unit {q.unit || 1}</Badge>
                  <span className="text-xs font-semibold text-slate-500">{q.question_type}</span>
                </div>
                <span className="font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                  {q.marks} Marks
                </span>
              </div>

              <p className="text-sm font-medium text-slate-800 mt-2">{q.question_text}</p>

              {q.question_type === 'MCQ' && q.options && (
                <div className="grid grid-cols-2 gap-2 mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  {q.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`p-1.5 rounded-md ${
                        opt === q.correct_answer ? 'font-bold text-emerald-800 bg-emerald-100/60' : 'text-slate-600'
                      }`}
                    >
                      {String.fromCharCode(65 + i)}. {opt} {opt === q.correct_answer && '✓ (Key)'}
                    </div>
                  ))}
                </div>
              )}

              {q.explanation && (
                <p className="text-xs text-slate-500 mt-2 italic">Marking Key: {q.explanation}</p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Author Question Modal */}
      <Modal isOpen={isQuestionModalOpen} onClose={() => setIsQuestionModalOpen(false)} title="Author Question Definition" maxWidth="max-w-2xl">
        <form onSubmit={handleSaveQuestion} className="space-y-4">
          {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Subject
              </label>
              <select
                value={qForm.subject_id}
                onChange={(e) => setQForm({ ...qForm, subject_id: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              >
                {subjects.map((s) => (
                  <option key={s.subject_id} value={s.subject_id}>
                    {s.subject_code} - {s.subject_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Unit / Module
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={qForm.unit}
                onChange={(e) => setQForm({ ...qForm, unit: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Question Type
              </label>
              <select
                value={qForm.question_type}
                onChange={(e) => setQForm({ ...qForm, question_type: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              >
                <option value="MCQ">MCQ (Multiple Choice)</option>
                <option value="ShortAnswer">Short Answer</option>
                <option value="Essay">Essay</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Difficulty Level
              </label>
              <select
                value={qForm.difficulty}
                onChange={(e) => setQForm({ ...qForm, difficulty: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Marks
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={qForm.marks}
                onChange={(e) => setQForm({ ...qForm, marks: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Question Text / Statement
            </label>
            <textarea
              required
              rows={3}
              value={qForm.question_text}
              onChange={(e) => setQForm({ ...qForm, question_text: e.target.value })}
              placeholder="State the problem or question prompt..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
            />
          </div>

          {qForm.question_type === 'MCQ' && (
            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Multiple Choice Options (A, B, C, D)
              </label>
              {qForm.options.map((opt, i) => (
                <input
                  key={i}
                  type="text"
                  required
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...qForm.options];
                    newOpts[i] = e.target.value;
                    setQForm({ ...qForm, options: newOpts });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                />
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Correct Answer Key
            </label>
            <input
              type="text"
              required
              value={qForm.correct_answer}
              onChange={(e) => setQForm({ ...qForm, correct_answer: e.target.value })}
              placeholder={qForm.question_type === 'MCQ' ? 'Must exactly match the correct option text' : 'Canonical answer or key points'}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Marking Guidance / Explanation
            </label>
            <textarea
              rows={2}
              value={qForm.explanation}
              onChange={(e) => setQForm({ ...qForm, explanation: e.target.value })}
              placeholder="Evaluation criteria and explanation..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsQuestionModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              {saving ? 'Saving...' : 'Add to Question Bank'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Automated Paper Generator Modal */}
      <Modal isOpen={isGeneratorModalOpen} onClose={() => setIsGeneratorModalOpen(false)} title="Automated Question Paper Generator">
        <form onSubmit={handleGeneratePaper} className="space-y-4">
          {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{error}</div>}
          {genSuccess && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">{genSuccess}</div>}

          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
            <p className="font-bold mb-1">Randomized Weighted Question Selection Engine:</p>
            The generator automatically retrieves published questions from PostgreSQL, eliminates duplicates, optimizes for difficulty distributions, and creates an official versioned paper for Examiner certification.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Target Subject
            </label>
            <select
              value={genForm.subject_id}
              onChange={(e) => {
                const sub = subjects.find((s) => s.subject_id === Number(e.target.value));
                setGenForm({ ...genForm, subject_id: e.target.value, title: sub ? `${sub.subject_code} Examination Paper` : '' });
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
            >
              {subjects.map((s) => (
                <option key={s.subject_id} value={s.subject_id}>
                  {s.subject_code} - {s.subject_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Paper Title
            </label>
            <input
              type="text"
              required
              value={genForm.title}
              onChange={(e) => setGenForm({ ...genForm, title: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Target Total Marks
            </label>
            <input
              type="number"
              min={10}
              max={200}
              required
              value={genForm.total_marks}
              onChange={(e) => setGenForm({ ...genForm, total_marks: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsGeneratorModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generating}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
            >
              {generating ? 'Assembling Paper...' : 'Generate & Submit for Review'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
