import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Users,
  Calendar,
  Ticket,
  FileQuestion,
  FileText,
  Laptop,
  CheckSquare,
  Award,
  BarChart3,
  ShieldAlert,
  Settings,
  X,
} from 'lucide-react';

export function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const role = user?.role;

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
      isActive
        ? 'bg-blue-600 text-white shadow-xs'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-black text-xs shadow-xs">
              CBIT
            </div>
            <div>
              <span className="font-bold text-slate-800 text-xs tracking-tight block">CBIT Gandipet</span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">Examination Portal</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4 space-y-6">
          {/* Main Group */}
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Main</p>
            <nav className="space-y-1">
              <NavLink to="/dashboard" className={navItemClass} onClick={onClose}>
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                Dashboard
              </NavLink>

              <NavLink to="/timetable" className={navItemClass} onClick={onClose}>
                <Calendar className="w-4 h-4 shrink-0" />
                Exam Timetable
              </NavLink>

              <NavLink to="/hall-tickets" className={navItemClass} onClick={onClose}>
                <Ticket className="w-4 h-4 shrink-0" />
                Hall Tickets
              </NavLink>
            </nav>
          </div>

          {/* Academic Management (Admin & Faculty) */}
          {(role === 'Admin' || role === 'Faculty') && (
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Academics</p>
              <nav className="space-y-1">
                {role === 'Admin' && (
                  <>
                    <NavLink to="/courses" className={navItemClass} onClick={onClose}>
                      <GraduationCap className="w-4 h-4 shrink-0" />
                      Courses
                    </NavLink>
                    <NavLink to="/subjects" className={navItemClass} onClick={onClose}>
                      <BookOpen className="w-4 h-4 shrink-0" />
                      Subjects
                    </NavLink>
                    <NavLink to="/users" className={navItemClass} onClick={onClose}>
                      <Users className="w-4 h-4 shrink-0" />
                      User Accounts
                    </NavLink>
                  </>
                )}
                <NavLink to="/students" className={navItemClass} onClick={onClose}>
                  <Users className="w-4 h-4 shrink-0" />
                  Students
                </NavLink>
              </nav>
            </div>
          )}

          {/* Exam Ops (Admin / Faculty / Examiner) */}
          {(role === 'Admin' || role === 'Faculty' || role === 'Examiner') && (
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Exam Operations</p>
              <nav className="space-y-1">
                {role === 'Admin' && (
                  <NavLink to="/schedules" className={navItemClass} onClick={onClose}>
                    <Calendar className="w-4 h-4 shrink-0" />
                    Exam Scheduling
                  </NavLink>
                )}

                {(role === 'Admin' || role === 'Faculty') && (
                  <>
                    <NavLink to="/question-bank" className={navItemClass} onClick={onClose}>
                      <FileQuestion className="w-4 h-4 shrink-0" />
                      Question Bank
                    </NavLink>
                    <NavLink to="/attendance" className={navItemClass} onClick={onClose}>
                      <CheckSquare className="w-4 h-4 shrink-0" />
                      Exam Attendance
                    </NavLink>
                  </>
                )}

                <NavLink to="/question-papers" className={navItemClass} onClick={onClose}>
                  <FileText className="w-4 h-4 shrink-0" />
                  Question Papers
                </NavLink>

                {(role === 'Faculty' || role === 'Examiner' || role === 'Admin') && (
                  <NavLink to="/marks-entry" className={navItemClass} onClick={onClose}>
                    <Award className="w-4 h-4 shrink-0" />
                    Marks & Evaluation
                  </NavLink>
                )}

                {(role === 'Examiner' || role === 'Admin') && (
                  <NavLink to="/moderation" className={navItemClass} onClick={onClose}>
                    <Award className="w-4 h-4 shrink-0" />
                    Moderation & Publish
                  </NavLink>
                )}
              </nav>
            </div>
          )}

          {/* Student Dedicated */}
          {role === 'Student' && (
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Student Corner</p>
              <nav className="space-y-1">
                <NavLink to="/online-exam" className={navItemClass} onClick={onClose}>
                  <Laptop className="w-4 h-4 shrink-0" />
                  Online Examinations
                </NavLink>
                <NavLink to="/results" className={navItemClass} onClick={onClose}>
                  <Award className="w-4 h-4 shrink-0" />
                  Results & GPA Card
                </NavLink>
              </nav>
            </div>
          )}

          {/* Results & Reports for staff */}
          {role !== 'Student' && (
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Analytics</p>
              <nav className="space-y-1">
                <NavLink to="/results" className={navItemClass} onClick={onClose}>
                  <Award className="w-4 h-4 shrink-0" />
                  Results
                </NavLink>
                <NavLink to="/reports" className={navItemClass} onClick={onClose}>
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  Reports & Ranking
                </NavLink>
              </nav>
            </div>
          )}

          {/* Admin System */}
          {role === 'Admin' && (
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Administration</p>
              <nav className="space-y-1">
                <NavLink to="/audit-logs" className={navItemClass} onClick={onClose}>
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  Audit Logs
                </NavLink>
                <NavLink to="/settings" className={navItemClass} onClick={onClose}>
                  <Settings className="w-4 h-4 shrink-0" />
                  System Settings
                </NavLink>
              </nav>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
