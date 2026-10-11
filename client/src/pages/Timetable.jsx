import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Badge } from '../components/Badge';
import { Calendar, Clock, MapPin, Printer, Search } from 'lucide-react';

export function Timetable() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchTimetable = async () => {
    try {
      const res = await api.get('/exams/schedules?is_published=true');
      setSchedules(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  const filtered = schedules.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.exam?.subject?.subject_name?.toLowerCase().includes(q) ||
      s.exam?.subject?.subject_code?.toLowerCase().includes(q) ||
      s.venue?.toLowerCase().includes(q);
    const matchesType = !typeFilter || s.exam?.exam_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Official Examination Timetable</h1>
          <p className="text-xs text-slate-500 mt-1">
            Certified examination schedule published by the Office of the Controller of Examinations
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition-colors no-print"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          Print Timetable
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs no-print">
        <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 px-3 py-1.5 flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject code, title, or room..."
            className="w-full text-xs bg-transparent focus:outline-hidden text-slate-800"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
        >
          <option value="">All Exam Types</option>
          <option value="Online">Online</option>
          <option value="Internal">Internal</option>
          <option value="External">External</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Exam Date</th>
                <th className="px-6 py-3.5">Time Interval</th>
                <th className="px-6 py-3.5">Subject Code & Title</th>
                <th className="px-6 py-3.5">Degree Program</th>
                <th className="px-6 py-3.5">Type & Total</th>
                <th className="px-6 py-3.5">Venue Location</th>
                <th className="px-6 py-3.5">Invigilator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-400">Loading timetable...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-400">No published schedules found.</td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.schedule_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                      {new Date(s.exam_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-700 whitespace-nowrap">
                      {s.start_time} - {s.end_time}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-blue-700 mr-2">{s.exam?.subject?.subject_code}</span>
                      <span className="font-medium text-slate-900">{s.exam?.subject?.subject_name}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {s.exam?.subject?.course?.course_name} (Batch {s.batch_year || 'All'})
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={s.exam?.exam_type === 'Online' ? 'purple' : s.exam?.exam_type === 'External' ? 'warning' : 'default'}>
                        {s.exam?.exam_type} ({s.exam?.total_marks} Marks)
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {s.venue}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {s.assigned_faculty?.user?.full_name || <span className="text-slate-400 italic">Central Proctor</span>}
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
