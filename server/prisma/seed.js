require('dotenv').config();
const { PrismaClient, UserRole, UserStatus, ExamType, QuestionType, DifficultyLevel, PaperStatus, AttemptStatus, ModerationStatus, AttendanceStatus } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting EMS Database Seeding ---');

  // Clear existing data in reverse relational order
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.result.deleteMany();
  await prisma.examResponse.deleteMany();
  await prisma.examAttempt.deleteMany();
  await prisma.questionPaperItem.deleteMany();
  await prisma.questionPaper.deleteMany();
  await prisma.question.deleteMany();
  await prisma.hallTicket.deleteMany();
  await prisma.examSchedule.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.facultySubject.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.student.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  await prisma.gradingPolicy.deleteMany();
  await prisma.systemSetting.deleteMany();

  // 1. System Settings
  await prisma.systemSetting.createMany({
    data: [
      { key: 'min_attendance_threshold', value: '75.0', description: 'Minimum attendance percentage required for hall ticket' },
      { key: 'institution_name', value: 'Chaitanya Bharathi Institute of Technology, Gandipet', description: 'Institution title' },
      { key: 'academic_year', value: '2026-2027', description: 'Current academic cycle' },
      { key: 'pass_marks_percentage', value: '40.0', description: 'Passing threshold percentage' },
    ],
  });

  // 2. Grading Policies
  const gradingPolicies = [
    { grade: 'O', min_percentage: 90.0, max_percentage: 100.0, grade_point: 10.0, description: 'Outstanding' },
    { grade: 'A+', min_percentage: 80.0, max_percentage: 89.99, grade_point: 9.0, description: 'Excellent' },
    { grade: 'A', min_percentage: 70.0, max_percentage: 79.99, grade_point: 8.0, description: 'Very Good' },
    { grade: 'B+', min_percentage: 60.0, max_percentage: 69.99, grade_point: 7.0, description: 'Good' },
    { grade: 'B', min_percentage: 55.0, max_percentage: 59.99, grade_point: 6.0, description: 'Above Average' },
    { grade: 'C', min_percentage: 50.0, max_percentage: 54.99, grade_point: 5.0, description: 'Average' },
    { grade: 'P', min_percentage: 40.0, max_percentage: 49.99, grade_point: 4.0, description: 'Pass' },
    { grade: 'F', min_percentage: 0.0, max_percentage: 39.99, grade_point: 0.0, description: 'Fail' },
  ];
  for (const gp of gradingPolicies) {
    await prisma.gradingPolicy.create({ data: gp });
  }

  // 3. Password Hashing (work factor 12)
  const salt = await bcrypt.genSalt(12);
  const adminHash = await bcrypt.hash('AdminPassword123!', salt);
  const facultyHash = await bcrypt.hash('FacultyPassword123!', salt);
  const examinerHash = await bcrypt.hash('ExaminerPassword123!', salt);
  const studentHash = await bcrypt.hash('StudentPassword123!', salt);

  // 4. Users
  const adminUser = await prisma.user.create({
    data: {
      full_name: 'Dr. Arthur Pendelton',
      email: 'admin@ems.edu',
      password_hash: adminHash,
      role: UserRole.Admin,
      status: UserStatus.active,
      institutional_id: 'ADM-2024-001',
      contact_number: '+1-555-0100',
    },
  });

  const facultyUser1 = await prisma.user.create({
    data: {
      full_name: 'Prof. Eleanor Vance',
      email: 'faculty1@ems.edu',
      password_hash: facultyHash,
      role: UserRole.Faculty,
      status: UserStatus.active,
      institutional_id: 'FAC-CS-001',
      contact_number: '+1-555-0101',
    },
  });

  const facultyUser2 = await prisma.user.create({
    data: {
      full_name: 'Dr. Marcus Brody',
      email: 'faculty2@ems.edu',
      password_hash: facultyHash,
      role: UserRole.Faculty,
      status: UserStatus.active,
      institutional_id: 'FAC-IT-002',
      contact_number: '+1-555-0102',
    },
  });

  const examinerUser = await prisma.user.create({
    data: {
      full_name: 'Dr. Sophia Sterling',
      email: 'examiner@ems.edu',
      password_hash: examinerHash,
      role: UserRole.Examiner,
      status: UserStatus.active,
      institutional_id: 'EXM-2024-001',
      contact_number: '+1-555-0103',
    },
  });

  const studentUser1 = await prisma.user.create({
    data: {
      full_name: 'Alice Johnson',
      email: 'student1@ems.edu',
      password_hash: studentHash,
      role: UserRole.Student,
      status: UserStatus.active,
      institutional_id: 'STU-2024-001',
      contact_number: '+1-555-0104',
    },
  });

  const studentUser2 = await prisma.user.create({
    data: {
      full_name: 'Bob Smith',
      email: 'student2@ems.edu',
      password_hash: studentHash,
      role: UserRole.Student,
      status: UserStatus.active,
      institutional_id: 'STU-2024-002',
      contact_number: '+1-555-0105',
    },
  });

  const studentUser3 = await prisma.user.create({
    data: {
      full_name: 'Charlie Davis',
      email: 'student3@ems.edu',
      password_hash: studentHash,
      role: UserRole.Student,
      status: UserStatus.active,
      institutional_id: 'STU-2024-003',
      contact_number: '+1-555-0106',
    },
  });

  // 5. Courses
  const cseCourse = await prisma.course.create({
    data: {
      course_name: 'B.Tech Computer Science & Engineering',
      duration_years: 4,
    },
  });

  const itCourse = await prisma.course.create({
    data: {
      course_name: 'B.Tech Information Technology',
      duration_years: 4,
    },
  });

  // 6. Faculty profiles
  const faculty1 = await prisma.faculty.create({
    data: {
      user_id: facultyUser1.user_id,
      department: 'Computer Science',
      designation: 'Associate Professor',
    },
  });

  const faculty2 = await prisma.faculty.create({
    data: {
      user_id: facultyUser2.user_id,
      department: 'Information Technology',
      designation: 'Professor',
    },
  });

  // 7. Students
  const student1 = await prisma.student.create({
    data: {
      user_id: studentUser1.user_id,
      enrollment_no: '2024-CSE-001',
      course_id: cseCourse.course_id,
      batch_year: 2024,
      attendance_pct: 88.5,
    },
  });

  const student2 = await prisma.student.create({
    data: {
      user_id: studentUser2.user_id,
      enrollment_no: '2024-CSE-002',
      course_id: cseCourse.course_id,
      batch_year: 2024,
      attendance_pct: 71.0, // Below 75% threshold! Ineligible demonstration
    },
  });

  const student3 = await prisma.student.create({
    data: {
      user_id: studentUser3.user_id,
      enrollment_no: '2024-CSE-003',
      course_id: cseCourse.course_id,
      batch_year: 2024,
      attendance_pct: 94.0,
    },
  });

  // 8. Subjects
  const subAlgorithms = await prisma.subject.create({
    data: {
      subject_code: 'CS301',
      subject_name: 'Design and Analysis of Algorithms',
      course_id: cseCourse.course_id,
      semester: 5,
      credits: 4,
    },
  });

  const subDBMS = await prisma.subject.create({
    data: {
      subject_code: 'CS302',
      subject_name: 'Database Management Systems',
      course_id: cseCourse.course_id,
      semester: 5,
      credits: 4,
    },
  });

  const subNetworks = await prisma.subject.create({
    data: {
      subject_code: 'CS303',
      subject_name: 'Computer Networks',
      course_id: cseCourse.course_id,
      semester: 5,
      credits: 3,
    },
  });

  const subOS = await prisma.subject.create({
    data: {
      subject_code: 'CS304',
      subject_name: 'Operating Systems',
      course_id: cseCourse.course_id,
      semester: 5,
      credits: 4,
    },
  });

  // 9. Faculty-Subject assignments
  await prisma.facultySubject.createMany({
    data: [
      { faculty_id: faculty1.faculty_id, subject_id: subAlgorithms.subject_id, is_primary_coordinator: true },
      { faculty_id: faculty1.faculty_id, subject_id: subDBMS.subject_id, is_primary_coordinator: false },
      { faculty_id: faculty2.faculty_id, subject_id: subNetworks.subject_id, is_primary_coordinator: true },
      { faculty_id: faculty2.faculty_id, subject_id: subOS.subject_id, is_primary_coordinator: true },
    ],
  });

  // 10. Questions Bank
  const q1 = await prisma.question.create({
    data: {
      subject_id: subAlgorithms.subject_id,
      question_text: 'What is the time complexity of QuickSort in the worst-case scenario?',
      question_type: QuestionType.MCQ,
      difficulty: DifficultyLevel.Easy,
      marks: 2,
      unit: 1,
      tags: 'algorithms,sorting,time-complexity',
      options: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(log n)'],
      correct_answer: 'O(n^2)',
      explanation: 'The worst case occurs when the chosen pivot always results in the most unbalanced partitions (e.g. sorted array with first element as pivot).',
      creator_id: faculty1.faculty_id,
    },
  });

  const q2 = await prisma.question.create({
    data: {
      subject_id: subAlgorithms.subject_id,
      question_text: 'Which algorithmic paradigm does Dijkstra’s shortest path algorithm follow?',
      question_type: QuestionType.MCQ,
      difficulty: DifficultyLevel.Easy,
      marks: 2,
      unit: 2,
      tags: 'graphs,greedy',
      options: ['Dynamic Programming', 'Greedy Method', 'Divide and Conquer', 'Backtracking'],
      correct_answer: 'Greedy Method',
      explanation: 'Dijkstra selects the locally optimal choice (minimum distance vertex) at each step.',
      creator_id: faculty1.faculty_id,
    },
  });

  const q3 = await prisma.question.create({
    data: {
      subject_id: subAlgorithms.subject_id,
      question_text: 'Explain the recurrence relation for the Strassen matrix multiplication algorithm and state its time complexity.',
      question_type: QuestionType.ShortAnswer,
      difficulty: DifficultyLevel.Medium,
      marks: 5,
      unit: 3,
      tags: 'divide-and-conquer,matrices',
      correct_answer: 'T(n) = 7T(n/2) + O(n^2), leading to O(n^log2(7)) ≈ O(n^2.8074).',
      explanation: 'Strassen reduces the number of multiplications from 8 to 7 using algebraic identities.',
      creator_id: faculty1.faculty_id,
    },
  });

  const q4 = await prisma.question.create({
    data: {
      subject_id: subAlgorithms.subject_id,
      question_text: 'Formulate the 0/1 Knapsack problem using Dynamic Programming. Provide the state definition, recurrence formula, and discuss time and space complexity.',
      question_type: QuestionType.Essay,
      difficulty: DifficultyLevel.Hard,
      marks: 10,
      unit: 4,
      tags: 'dynamic-programming,knapsack',
      correct_answer: 'dp[i][w] = max(dp[i-1][w], dp[i-1][w-wt[i]] + val[i]). Time complexity is O(nW), pseudo-polynomial.',
      explanation: 'Students must elaborate on overlapping subproblems and optimal substructure.',
      creator_id: faculty1.faculty_id,
    },
  });

  const q5 = await prisma.question.create({
    data: {
      subject_id: subDBMS.subject_id,
      question_text: 'Which normal form eliminates partial functional dependencies?',
      question_type: QuestionType.MCQ,
      difficulty: DifficultyLevel.Easy,
      marks: 2,
      unit: 1,
      tags: 'normalization,relational-design',
      options: ['1NF', '2NF', '3NF', 'BCNF'],
      correct_answer: '2NF',
      explanation: 'Second Normal Form (2NF) ensures every non-prime attribute is fully functionally dependent on any candidate key.',
      creator_id: faculty1.faculty_id,
    },
  });

  const q6 = await prisma.question.create({
    data: {
      subject_id: subDBMS.subject_id,
      question_text: 'Explain the ACID properties of database transactions with concrete examples of violation for each.',
      question_type: QuestionType.Essay,
      difficulty: DifficultyLevel.Medium,
      marks: 10,
      unit: 3,
      tags: 'transactions,acid,concurrency',
      correct_answer: 'Atomicity, Consistency, Isolation, and Durability must be comprehensively analyzed.',
      explanation: 'Evaluation should award points for transaction recovery and isolation levels.',
      creator_id: faculty1.faculty_id,
    },
  });

  // 11. Exams
  const exam1 = await prisma.exam.create({
    data: {
      subject_id: subAlgorithms.subject_id,
      exam_type: ExamType.Online,
      total_marks: 50,
      duration_minutes: 60,
    },
  });

  const exam2 = await prisma.exam.create({
    data: {
      subject_id: subDBMS.subject_id,
      exam_type: ExamType.External,
      total_marks: 100,
      duration_minutes: 180,
    },
  });

  // 12. Exam Schedules
  const today = new Date();
  const scheduleDate1 = new Date(today);
  scheduleDate1.setDate(scheduleDate1.getDate() + 1); // Tomorrow

  const scheduleDate2 = new Date(today);
  scheduleDate2.setDate(scheduleDate2.getDate() + 3);

  const schedule1 = await prisma.examSchedule.create({
    data: {
      exam_id: exam1.exam_id,
      exam_date: scheduleDate1,
      start_time: '10:00',
      end_time: '11:00',
      venue: 'Online Exam Portal Lab-A',
      batch_year: 2024,
      is_published: true,
      assigned_faculty_id: faculty1.faculty_id,
    },
  });

  const schedule2 = await prisma.examSchedule.create({
    data: {
      exam_id: exam2.exam_id,
      exam_date: scheduleDate2,
      start_time: '14:00',
      end_time: '17:00',
      venue: 'Auditorium Hall 101',
      batch_year: 2024,
      is_published: true,
      assigned_faculty_id: faculty2.faculty_id,
    },
  });

  // 13. Hall Tickets
  // Alice: attendance 88.5% >= 75% -> Issued & Eligible
  const ticket1 = await prisma.hallTicket.create({
    data: {
      student_id: student1.student_id,
      schedule_id: schedule1.schedule_id,
      ticket_number: 'HT-2026-CS301-001',
      eligibility_status: 'Eligible',
      is_approved: true,
    },
  });

  const ticket3 = await prisma.hallTicket.create({
    data: {
      student_id: student3.student_id,
      schedule_id: schedule1.schedule_id,
      ticket_number: 'HT-2026-CS301-003',
      eligibility_status: 'Eligible',
      is_approved: true,
    },
  });

  // Bob: attendance 71.0% < 75% -> Ineligible record
  await prisma.hallTicket.create({
    data: {
      student_id: student2.student_id,
      schedule_id: schedule1.schedule_id,
      ticket_number: 'HT-2026-CS301-002-DENIED',
      eligibility_status: 'Ineligible',
      rejection_reason: 'Attendance 71.00% is below the required 75.00% threshold',
      is_approved: false,
    },
  });

  // 14. Generated Question Paper
  const qPaper = await prisma.questionPaper.create({
    data: {
      subject_id: subAlgorithms.subject_id,
      exam_id: exam1.exam_id,
      title: 'CS301 Mid-Term Examination Paper 2026',
      total_marks: 19,
      version: 1,
      created_by_id: faculty1.faculty_id,
      status: PaperStatus.Approved,
      examiner_feedback: 'Question distribution and difficulty balance verified.',
      approved_at: new Date(),
    },
  });

  await prisma.questionPaperItem.createMany({
    data: [
      { paper_id: qPaper.paper_id, question_id: q1.question_id, order_index: 1, marks: 2 },
      { paper_id: qPaper.paper_id, question_id: q2.question_id, order_index: 2, marks: 2 },
      { paper_id: qPaper.paper_id, question_id: q3.question_id, order_index: 3, marks: 5 },
      { paper_id: qPaper.paper_id, question_id: q4.question_id, order_index: 4, marks: 10 },
    ],
  });

  // 15. Completed past exam and results for demonstration
  const pastExam = await prisma.exam.create({
    data: {
      subject_id: subNetworks.subject_id,
      exam_type: ExamType.Internal,
      total_marks: 100,
      duration_minutes: 120,
    },
  });

  const pastScheduleDate = new Date(today);
  pastScheduleDate.setDate(pastScheduleDate.getDate() - 10);

  const pastSchedule = await prisma.examSchedule.create({
    data: {
      exam_id: pastExam.exam_id,
      exam_date: pastScheduleDate,
      start_time: '10:00',
      end_time: '12:00',
      venue: 'Exam Hall B-202',
      batch_year: 2024,
      is_published: true,
      assigned_faculty_id: faculty2.faculty_id,
    },
  });

  // Attendance for past exam
  await prisma.attendance.createMany({
    data: [
      { student_id: student1.student_id, schedule_id: pastSchedule.schedule_id, status: AttendanceStatus.Present },
      { student_id: student2.student_id, schedule_id: pastSchedule.schedule_id, status: AttendanceStatus.Present },
      { student_id: student3.student_id, schedule_id: pastSchedule.schedule_id, status: AttendanceStatus.Present },
    ],
  });

  // Results for past exam
  await prisma.result.createMany({
    data: [
      {
        student_id: student1.student_id,
        exam_id: pastExam.exam_id,
        marks_obtained: 85.0,
        max_marks: 100.0,
        grade: 'A+',
        grade_points: 9.0,
        evaluator_id: faculty2.faculty_id,
        moderation_status: ModerationStatus.Approved,
        is_published: true,
        remarks: 'Commendable performance in routing algorithms.',
      },
      {
        student_id: student2.student_id,
        exam_id: pastExam.exam_id,
        marks_obtained: 62.0,
        max_marks: 100.0,
        grade: 'B+',
        grade_points: 7.0,
        evaluator_id: faculty2.faculty_id,
        moderation_status: ModerationStatus.Approved,
        is_published: true,
        remarks: 'Needs improvement in transport layer protocols.',
      },
      {
        student_id: student3.student_id,
        exam_id: pastExam.exam_id,
        marks_obtained: 94.0,
        max_marks: 100.0,
        grade: 'O',
        grade_points: 10.0,
        evaluator_id: faculty2.faculty_id,
        moderation_status: ModerationStatus.Approved,
        is_published: true,
        remarks: 'Outstanding performance across all sections.',
      },
    ],
  });

  // 16. Notifications
  await prisma.notification.createMany({
    data: [
      {
        user_id: studentUser1.user_id,
        message: 'Your Hall Ticket for CS301 Mid-Term Examination is ready to download.',
        type: 'HALLTICKET',
        delivery_status: 'Sent',
        is_read: false,
      },
      {
        user_id: studentUser1.user_id,
        message: 'Results for CS303 Computer Networks have been officially published.',
        type: 'RESULT',
        delivery_status: 'Sent',
        is_read: true,
      },
      {
        user_id: studentUser2.user_id,
        message: 'Alert: Your current attendance (71.00%) is below the required 75.00% threshold for CS301.',
        type: 'ELIGIBILITY',
        delivery_status: 'Sent',
        is_read: false,
      },
      {
        user_id: facultyUser1.user_id,
        message: 'Question paper for CS301 Mid-Term has been approved by the Examiner.',
        type: 'QUESTION_PAPER',
        delivery_status: 'Sent',
        is_read: false,
      },
      {
        user_id: examinerUser.user_id,
        message: 'New question paper draft submitted for review: CS301 Mid-Term Examination.',
        type: 'QUESTION_PAPER',
        delivery_status: 'Sent',
        is_read: true,
      },
    ],
  });

  // 17. Initial Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        user_id: adminUser.user_id,
        action: 'SYSTEM_INITIALIZATION',
        affected_resource: 'DATABASE',
        resource_id: 'ALL',
        metadata: { info: 'System seeded with academic structures, courses, and baseline policies.' },
      },
      {
        user_id: adminUser.user_id,
        action: 'SCHEDULE_PUBLISHED',
        affected_resource: 'EXAM_SCHEDULE',
        resource_id: String(schedule1.schedule_id),
        metadata: { exam: 'CS301 Mid-Term', venue: schedule1.venue },
      },
      {
        user_id: adminUser.user_id,
        action: 'HALL_TICKETS_GENERATED',
        affected_resource: 'HALL_TICKET',
        resource_id: String(schedule1.schedule_id),
        metadata: { eligible_count: 2, ineligible_count: 1 },
      },
    ],
  });

  console.log('✅ EMS Database Seeding successfully completed!');
  console.log('----------------------------------------------------');
  console.log('Login credentials for testing:');
  console.log('  Admin:    admin@ems.edu    / AdminPassword123!');
  console.log('  Faculty:  faculty1@ems.edu / FacultyPassword123!');
  console.log('  Examiner: examiner@ems.edu / ExaminerPassword123!');
  console.log('  Student:  student1@ems.edu / StudentPassword123!');
  console.log('  Student:  student2@ems.edu / StudentPassword123! (Ineligible)');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
