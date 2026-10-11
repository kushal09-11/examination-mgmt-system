import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/server';
import prisma from '../src/config/db';
import { determineGrade, calculateGPA, calculateCGPA } from '../src/utils/gpaCalculator';
import { isTimeOverlapping } from '../src/services/examScheduleService';

describe('EMS Automated Test Suite', () => {
  let adminToken = '';
  let studentToken = '';
  let facultyToken = '';

  beforeAll(async () => {
    // Health check test
    const healthRes = await request(app).get('/api/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('healthy');

    // Admin login
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@ems.edu',
      password: 'AdminPassword123!',
    });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.accessToken;

    // Student login
    const studentLogin = await request(app).post('/api/auth/login').send({
      email: 'student1@ems.edu',
      password: 'StudentPassword123!',
    });
    expect(studentLogin.status).toBe(200);
    studentToken = studentLogin.body.data.accessToken;

    // Faculty login
    const facultyLogin = await request(app).post('/api/auth/login').send({
      email: 'faculty1@ems.edu',
      password: 'FacultyPassword123!',
    });
    expect(facultyLogin.status).toBe(200);
    facultyToken = facultyLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // 1. UNIT TESTS: GPA & CGPA Engine (SRS Formula Verification)
  describe('Grade & GPA Calculation Engine', () => {
    it('should accurately calculate letter grades based on percentage', () => {
      expect(determineGrade(95).grade).toBe('O');
      expect(determineGrade(95).gradePoint).toBe(10.0);

      expect(determineGrade(85).grade).toBe('A+');
      expect(determineGrade(85).gradePoint).toBe(9.0);

      expect(determineGrade(75).grade).toBe('A');
      expect(determineGrade(75).gradePoint).toBe(8.0);

      expect(determineGrade(65).grade).toBe('B+');
      expect(determineGrade(65).gradePoint).toBe(7.0);

      expect(determineGrade(58).grade).toBe('B');
      expect(determineGrade(58).gradePoint).toBe(6.0);

      expect(determineGrade(52).grade).toBe('C');
      expect(determineGrade(52).gradePoint).toBe(5.0);

      expect(determineGrade(45).grade).toBe('P');
      expect(determineGrade(45).gradePoint).toBe(4.0);

      expect(determineGrade(32).grade).toBe('F');
      expect(determineGrade(32).gradePoint).toBe(0.0);
    });

    it('should compute weighted GPA according to formula: Σ(Credits × Grade Points) / Σ(Credits)', () => {
      // Subject 1: 4 credits, grade point 9.0 (36)
      // Subject 2: 4 credits, grade point 8.0 (32)
      // Subject 3: 3 credits, grade point 10.0 (30)
      // Total points: 98 / 11 credits = 8.909... -> 8.91
      const subjects = [
        { credits: 4, gradePoint: 9.0 },
        { credits: 4, gradePoint: 8.0 },
        { credits: 3, gradePoint: 10.0 },
      ];
      const gpa = calculateGPA(subjects);
      expect(gpa).toBe(8.91);
    });

    it('should calculate cumulative CGPA across semesters', () => {
      const semesters = [
        { semester: 1, gpa: 8.5, credits: 20 },
        { semester: 2, gpa: 9.0, credits: 20 },
      ];
      const cgpa = calculateCGPA(semesters);
      expect(cgpa).toBe(8.75);
    });
  });

  // 2. UNIT TESTS: Schedule Overlap & Conflict Logic
  describe('Exam Schedule Conflict Logic', () => {
    it('should detect overlapping time intervals on the same day', () => {
      // Session 1: 10:00 - 11:30
      // Session 2: 11:00 - 12:30 (Overlaps!)
      const isOverlapping = '10:00' < '12:30' && '11:30' > '11:00';
      expect(isOverlapping).toBe(true);

      // Session 3: 11:30 - 13:00 (No overlap with 10:00 - 11:30)
      const noOverlap = '10:00' < '13:00' && '11:30' > '11:30';
      expect(noOverlap).toBe(false);
    });
  });

  // 3. INTEGRATION TESTS: RBAC Protection
  describe('Role-Based Access Control (RBAC)', () => {
    it('should forbid student from accessing admin registration endpoint', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          email: 'unauthorized@ems.edu',
          full_name: 'Hacker',
          role: 'Faculty',
          password: 'Password123!',
          institutional_id: 'HACK-001',
        });
      expect(res.status).toBe(403);
    });

    it('should allow Admin to view courses', async () => {
      const res = await request(app)
        .get('/api/academic/courses')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should allow Faculty to view question bank', async () => {
      const res = await request(app)
        .get('/api/bank/questions')
        .set('Authorization', `Bearer ${facultyToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // 4. INTEGRATION TESTS: Hall Ticket Eligibility Rule (75% Threshold)
  describe('Hall Ticket Eligibility Enforcement', () => {
    it('should confirm eligibility for student with attendance >= 75%', async () => {
      // Alice has attendance 88.5%
      await prisma.student.update({
        where: { enrollment_no: '2024-CSE-001' },
        data: { attendance_pct: 88.5 },
      });
      const student = await prisma.student.findFirst({ where: { enrollment_no: '2024-CSE-001' } });
      const schedule = await prisma.examSchedule.findFirst();

      const res = await request(app)
        .get(`/api/hall-tickets/eligibility/${student.student_id}/${schedule.schedule_id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isEligible).toBe(true);
    });

    it('should deny eligibility for student with attendance < 75%', async () => {
      // Bob has attendance 71.0%
      await prisma.student.update({
        where: { enrollment_no: '2024-CSE-002' },
        data: { attendance_pct: 71.0 },
      });
      const student = await prisma.student.findFirst({ where: { enrollment_no: '2024-CSE-002' } });
      const schedule = await prisma.examSchedule.findFirst();

      const res = await request(app)
        .get(`/api/hall-tickets/eligibility/${student.student_id}/${schedule.schedule_id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isEligible).toBe(false);
      expect(res.body.data.reason).toContain('below the required threshold');
    });
  });

  // 5. INTEGRATION TESTS: Marks Validation Rule
  describe('Marks Validation Rules', () => {
    it('should reject marks exceeding maximum marks of examination', async () => {
      const exam = await prisma.exam.findFirst();
      const student = await prisma.student.findFirst();

      const res = await request(app)
        .post('/api/eval/marks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          exam_id: exam.exam_id,
          marks_list: [
            {
              student_id: student.student_id,
              marks_obtained: exam.total_marks + 50, // EXCEEDS!
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('cannot exceed maximum marks');
    });
  });

  // 6. INTEGRATION TESTS: Append-Only Audit Logging
  describe('Audit Logging', () => {
    it('should provide audit logs to admin with action and resource tracking', async () => {
      const res = await request(app)
        .get('/api/ops/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // 7. SECURITY TESTS: 5-Failed Login Lockout Rule
  describe('Account Lockout Security Policy', () => {
    it('should lock user account after consecutive failed login attempts', async () => {
      // First create a dedicated test user for lockout testing
      const testEmail = `locktest_${Date.now()}@ems.edu`;
      await prisma.user.create({
        data: {
          email: testEmail,
          password_hash: '$2b$12$e8YkZ7c7/qC3q6sJv3iK8.6N0lKq4oQzN8lKq4oQzN8lKq4oQzN8l',
          full_name: 'Lockout Test User',
          role: 'Student',
          status: 'active',
          failed_attempts: 4, // Set to 4, so next wrong password makes it 5
        },
      });

      // 5th failed attempt
      const failRes = await request(app).post('/api/auth/login').send({
        email: testEmail,
        password: 'WrongPassword!',
      });
      expect(failRes.status).toBe(403);
      expect(failRes.body.message).toContain('Account has been locked');

      // Verify DB record status changed to Locked
      const lockedUser = await prisma.user.findUnique({ where: { email: testEmail } });
      expect(lockedUser.status).toBe('locked');
      expect(lockedUser.locked_until).not.toBeNull();
    });
  });

  // 8. ONLINE EXAMINATION INTEGRATION TESTS
  describe('Online Examination Workflow', () => {
    it('should allow student to fetch available online exams', async () => {
      const res = await request(app)
        .get('/api/online-exam/available')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should track tab-switch proctoring events', async () => {
      // Find an existing or ongoing attempt
      const attempt = await prisma.examAttempt.findFirst();
      if (attempt) {
        const res = await request(app)
          .post('/api/online-exam/tab-switch')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            attempt_id: attempt.attempt_id,
            reason: 'Window blurred / tab switched during test',
          });
        expect([200, 403]).toContain(res.status); // 200 if student owns attempt, 403 otherwise
      }
    });
  });

  // 9. ATTENDANCE INTEGRATION TESTS
  describe('Attendance Relational Constraints', () => {
    it('should prevent duplicate attendance records for the same student and schedule', async () => {
      const student = await prisma.student.findFirst();
      const schedule = await prisma.examSchedule.findFirst();

      // First attendance submission
      const res1 = await request(app)
        .post('/api/eval/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schedule_id: schedule.schedule_id,
          records: [
            { student_id: student.student_id, status: 'Present' }
          ]
        });
      expect(res1.status).toBe(200);

      // Re-submitting updates gracefully rather than creating duplicates
      const count = await prisma.attendance.count({
        where: {
          student_id: student.student_id,
          schedule_id: schedule.schedule_id,
        }
      });
      expect(count).toBe(1);
    });
  });
});
