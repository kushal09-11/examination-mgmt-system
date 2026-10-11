import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import {
  Users,
  GraduationCap,
  Calendar,
  Ticket,
  FileCheck,
  Award,
  AlertTriangle,
  Clock,
  ArrowRight,
  Download,
  BookOpen,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/ops/dashboard');
        setData(res.data.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-1/4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <Badge variant="primary" className="bg-blue-400/20 text-blue-200 border-blue-400/30 mb-3">
            {user?.role} Control Center
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.full_name}
          </h1>
          <p className="text-sm text-blue-100/90 mt-1 max-w-xl">
            Chaitanya Bharathi Institute of Technology, Gandipet — Monitor examination schedules, candidate admit eligibility, question workflows, and grade distributions.
          </p>
        </div>
      </div>

      {/* ----------------- ADMIN DASHBOARD ----------------- */}
      {user?.role === 'Admin' && data?.metrics && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Students" value={data.metrics.totalStudents} icon={Users} color="blue" />
            <StatCard title="Upcoming Exams" value={data.metrics.upcomingExams} icon={Calendar} color="indigo" />
            <StatCard title="Hall Tickets Issued" value={data.metrics.hallTicketsIssued} icon={Ticket} color="emerald" />
            <StatCard title="Papers Under Review" value={data.metrics.pendingPaperApprovals} icon={FileCheck} color="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Grade Distribution Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Institutional Grade Distribution</h3>
                  <p className="text-xs text-slate-500">Live finalized examination results aggregated across subjects</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.gradeDistribution || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="grade" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Quick Administration</h3>
                <p className="text-xs text-slate-500 mb-4">Core examination workflows</p>
                <div className="space-y-2.5">
                  <Link
                    to="/schedules"
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-xs font-semibold text-slate-800"
                  >
                    <span>Schedule Examination</span>
                    <ArrowRight className="w-4 h-4 text-blue-600" />
                  </Link>
                  <Link
                    to="/hall-tickets"
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-xs font-semibold text-slate-800"
                  >
                    <span>Issue Batch Hall Tickets</span>
                    <ArrowRight className="w-4 h-4 text-emerald-600" />
                  </Link>
                  <Link
                    to="/users"
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-xs font-semibold text-slate-800"
                  >
                    <span>Register New Student/Faculty</span>
                    <ArrowRight className="w-4 h-4 text-indigo-600" />
                  </Link>
                  <Link
                    to="/reports"
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 transition-all text-xs font-semibold text-slate-800"
                  >
                    <span>Export Rank & Pass Reports</span>
                    <ArrowRight className="w-4 h-4 text-purple-600" />
                  </Link>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Threshold: 75% Attendance</span>
                <Link to="/settings" className="text-blue-600 font-semibold hover:underline">
                  Configure
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Audit Events */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Recent Security & System Audit Trail</h3>
              <Link to="/audit-logs" className="text-xs font-bold text-blue-600 hover:text-blue-800">
                View all logs →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {data.recentAudits?.map((log) => (
                <div key={log.log_id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 mr-2">{log.action}</span>
                    <span className="text-slate-500">by {log.user?.full_name || 'System'}</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- FACULTY DASHBOARD ----------------- */}
      {user?.role === 'Faculty' && data && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Assigned Subjects" value={data.metrics?.totalAssignedSubjects || 0} icon={BookOpen} color="blue" />
            <StatCard title="Questions Authored" value={data.metrics?.questionsAuthored || 0} icon={FileCheck} color="indigo" />
            <StatCard title="Pending Evaluations" value={data.metrics?.pendingEvaluations || 0} icon={Award} color="amber" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4">My Assigned Subjects</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.assignedSubjects?.map((sub) => (
                <div key={sub.subject_id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                      {sub.code}
                    </span>
                    {sub.isPrimary && (
                      <Badge variant="primary" className="text-[10px]">
                        Primary Coordinator
                      </Badge>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-2">{sub.name}</h4>
                  <p className="text-xs text-slate-500">{sub.course}</p>
                  <div className="mt-4 flex gap-2">
                    <Link
                      to="/question-bank"
                      className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700"
                    >
                      Manage Questions ({sub.questionsCount})
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- STUDENT DASHBOARD ----------------- */}
      {user?.role === 'Student' && data && (
        <div className="space-y-8">
          {/* Eligibility Alert Banner */}
          {data.student?.attendance_pct < 75 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">Attendance Threshold Alert</h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Your current cumulative attendance is {data.student.attendance_pct.toFixed(1)}%, which is below the mandatory 75.00% eligibility threshold. Hall ticket issuance may be restricted until attendance is made up.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Attendance Status"
              value={`${data.student?.attendance_pct?.toFixed(1) || 0}%`}
              subtitle={data.student?.attendance_pct >= 75 ? 'Eligible for Hall Ticket' : 'Below 75% Requirement'}
              icon={Clock}
              color={data.student?.attendance_pct >= 75 ? 'emerald' : 'amber'}
            />
            <StatCard
              title="Cumulative GPA"
              value={data.student?.gpa?.toFixed(2) || '0.00'}
              subtitle="Calculated from finalized results"
              icon={Award}
              color="indigo"
            />
            <StatCard
              title="Upcoming Exams"
              value={data.upcomingExams?.length || 0}
              subtitle="Published session timetable"
              icon={Calendar}
              color="blue"
            />
          </div>

          {/* Quick Actions for Student */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900">My Hall Tickets</h3>
                <Link to="/hall-tickets" className="text-xs font-bold text-blue-600 hover:text-blue-800">
                  View all →
                </Link>
              </div>
              {data.hallTickets?.length === 0 ? (
                <p className="text-xs text-slate-500">No hall tickets issued for your account yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.hallTickets?.map((t) => (
                    <div key={t.hallticket_id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{t.schedule.exam.subject.subject_name}</p>
                        <p className="text-[11px] text-slate-500">No: {t.ticket_number}</p>
                      </div>
                      <Badge variant={t.eligibility_status === 'Eligible' ? 'success' : 'danger'}>
                        {t.eligibility_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900">Active Online Exams</h3>
                <Link to="/online-exam" className="text-xs font-bold text-blue-600 hover:text-blue-800">
                  Exam Portal →
                </Link>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Attempt timed, proctored examinations for scheduled courses directly through the portal.
              </p>
              <Link
                to="/online-exam"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                Go to Online Examination Room
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- EXAMINER DASHBOARD ----------------- */}
      {user?.role === 'Examiner' && data && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Papers Awaiting Review" value={data.metrics?.papersUnderReview || 0} icon={FileCheck} color="amber" />
            <StatCard title="Results for Moderation" value={data.metrics?.resultsUnderReview || 0} icon={Award} color="indigo" />
            <StatCard title="Approved Papers" value={data.metrics?.totalApprovedPapers || 0} icon={BookOpen} color="emerald" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Question Papers Requiring Review</h3>
              <Link to="/question-papers" className="text-xs font-bold text-blue-600 hover:text-blue-800">
                View paper workflow →
              </Link>
            </div>
            {data.pendingPapers?.length === 0 ? (
              <p className="text-xs text-slate-500">No question papers awaiting review at this time.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.pendingPapers?.map((p) => (
                  <div key={p.paper_id} className="py-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{p.title}</h4>
                      <p className="text-[11px] text-slate-500">{p.subject.subject_code} - Total Marks: {p.total_marks}</p>
                    </div>
                    <Link
                      to="/question-papers"
                      className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100"
                    >
                      Review & Approve
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
