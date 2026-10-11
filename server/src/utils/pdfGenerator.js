const PDFDocument = require('pdfkit');

/**
 * Generate Hall Ticket PDF Stream
 */
function generateHallTicketPDF(hallTicketData, dataStream) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(dataStream);

  const { student, schedule, ticketNumber, issuedAt } = hallTicketData;
  const exam = schedule.exam;
  const subject = exam.subject;
  const course = student.course;

  // Header Box
  doc.rect(40, 40, 515, 760).stroke('#1e3a8a');
  doc.rect(45, 45, 505, 750).stroke('#94a3b8');

  // Title
  doc.fillColor('#1e3a8a')
     .fontSize(16)
     .font('Helvetica-Bold')
     .text('CHAITANYA BHARATHI INSTITUTE OF TECHNOLOGY, GANDIPET', 50, 65, { align: 'center' });

  doc.fillColor('#475569')
     .fontSize(10)
     .font('Helvetica')
     .text('Autonomous • Affiliated to Osmania University • Hyderabad - 500075', { align: 'center' })
     .text('Office of the Controller of Examinations', { align: 'center' })
     .moveDown(0.5);

  doc.fillColor('#0f172a')
     .fontSize(14)
     .font('Helvetica-Bold')
     .text('OFFICIAL EXAMINATION HALL TICKET', { align: 'center' });

  doc.moveDown(1);
  const startY = doc.y;

  // Ticket Identifier & Bar
  doc.rect(60, startY, 475, 26).fill('#f1f5f9');
  doc.fillColor('#1e293b')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text(`HALL TICKET NO: ${ticketNumber}`, 70, startY + 8);
  doc.text(`ISSUED: ${new Date(issuedAt).toLocaleDateString()}`, 380, startY + 8);

  // Student Details Block
  const detailsY = startY + 40;
  doc.fillColor('#334155').font('Helvetica-Bold').fontSize(10);
  doc.text('CANDIDATE DETAILS', 60, detailsY);

  doc.rect(60, detailsY + 15, 475, 90).stroke('#cbd5e1');

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b');
  doc.text('Candidate Name:', 75, detailsY + 25);
  doc.font('Helvetica').text(student.user.full_name, 180, detailsY + 25);

  doc.font('Helvetica-Bold').text('Enrollment Number:', 75, detailsY + 45);
  doc.font('Helvetica').text(student.enrollment_no, 180, detailsY + 45);

  doc.font('Helvetica-Bold').text('Degree / Program:', 75, detailsY + 65);
  doc.font('Helvetica').text(course.course_name, 180, detailsY + 65);

  doc.font('Helvetica-Bold').text('Batch Year:', 75, detailsY + 85);
  doc.font('Helvetica').text(`${student.batch_year} (Attendance: ${Number(student.attendance_pct).toFixed(1)}%)`, 180, detailsY + 85);

  // Examination Details Block
  const examY = detailsY + 120;
  doc.fillColor('#334155').font('Helvetica-Bold').fontSize(10);
  doc.text('EXAMINATION SCHEDULE & VENUE', 60, examY);

  doc.rect(60, examY + 15, 475, 110).stroke('#cbd5e1');

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b');
  doc.text('Subject Code & Name:', 75, examY + 25);
  doc.font('Helvetica').text(`${subject.subject_code} - ${subject.subject_name}`, 200, examY + 25);

  doc.font('Helvetica-Bold').text('Examination Type:', 75, examY + 45);
  doc.font('Helvetica').text(`${exam.exam_type} (${exam.total_marks} Marks)`, 200, examY + 45);

  doc.font('Helvetica-Bold').text('Date of Examination:', 75, examY + 65);
  doc.font('Helvetica').text(new Date(schedule.exam_date).toDateString(), 200, examY + 65);

  doc.font('Helvetica-Bold').text('Session Time:', 75, examY + 85);
  doc.font('Helvetica').text(`${schedule.start_time} to ${schedule.end_time} (${exam.duration_minutes} Mins)`, 200, examY + 85);

  doc.font('Helvetica-Bold').text('Designated Venue / Room:', 75, examY + 105);
  doc.font('Helvetica').text(schedule.venue, 200, examY + 105);

  // Instructions
  const instY = examY + 145;
  doc.fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(10);
  doc.text('EXAMINATION INSTRUCTIONS TO CANDIDATE:', 60, instY);

  const instructions = [
    '1. The candidate must present this signed hall ticket along with their valid institutional photo ID.',
    '2. Candidates must report to the examination hall at least 15 minutes prior to commencement.',
    '3. For online examinations, browser sessions are monitored. Multiple tab switches will be logged.',
    '4. Programmable calculators, smart devices, and unauthorized literature are strictly prohibited.',
    '5. Ineligibility or fraudulent representations will result in immediate disqualification.',
  ];

  let curY = instY + 18;
  doc.font('Helvetica').fontSize(8.5).fillColor('#334155');
  instructions.forEach((line) => {
    doc.text(line, 65, curY);
    curY += 16;
  });

  // Signatures
  const signY = curY + 40;
  doc.lineWidth(0.8).moveTo(75, signY).lineTo(220, signY).stroke('#94a3b8');
  doc.fontSize(8.5).font('Helvetica-Bold').text('Candidate Signature', 100, signY + 5);

  doc.lineWidth(0.8).moveTo(375, signY).lineTo(520, signY).stroke('#94a3b8');
  doc.fontSize(8.5).font('Helvetica-Bold').text('Controller of Examinations', 385, signY + 5);

  doc.end();
}

/**
 * Generate Result Grade Sheet PDF
 */
function generateResultCardPDF(resultData, dataStream) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(dataStream);

  const { student, results, gpa, cgpa } = resultData;

  // Header Box
  doc.rect(40, 40, 515, 760).stroke('#0f766e');

  doc.fillColor('#0f766e')
     .fontSize(16)
     .font('Helvetica-Bold')
     .text('CHAITANYA BHARATHI INSTITUTE OF TECHNOLOGY, GANDIPET', 50, 65, { align: 'center' });

  doc.fillColor('#475569')
     .fontSize(10)
     .font('Helvetica')
     .text('Autonomous • Affiliated to Osmania University • Hyderabad - 500075', { align: 'center' })
     .text('Official Academic Performance Statement', { align: 'center' })
     .moveDown(0.5);

  doc.fillColor('#0f172a')
     .fontSize(14)
     .font('Helvetica-Bold')
     .text('SEMESTER GRADE SHEET', { align: 'center' })
     .moveDown(1);

  const detailsY = doc.y;
  doc.rect(60, detailsY, 475, 60).fill('#f0fdf4');
  doc.fillColor('#166534').font('Helvetica-Bold').fontSize(9);
  doc.text(`Student: ${student.user.full_name}`, 75, detailsY + 12);
  doc.text(`Enrollment No: ${student.enrollment_no}`, 320, detailsY + 12);
  doc.text(`Course: ${student.course.course_name}`, 75, detailsY + 32);
  doc.text(`Batch Year: ${student.batch_year}`, 320, detailsY + 32);

  const tableY = detailsY + 80;
  doc.rect(60, tableY, 475, 24).fill('#0f766e');
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5);
  doc.text('Subject Code', 70, tableY + 7);
  doc.text('Subject Name', 160, tableY + 7);
  doc.text('Max', 330, tableY + 7);
  doc.text('Obtained', 370, tableY + 7);
  doc.text('Grade', 430, tableY + 7);
  doc.text('Points', 485, tableY + 7);

  let rowY = tableY + 24;
  results.forEach((r, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    doc.rect(60, rowY, 475, 20).fill(bg);
    doc.fillColor('#1e293b').font('Helvetica').fontSize(8.5);
    doc.text(r.exam.subject.subject_code, 70, rowY + 5);
    doc.text(r.exam.subject.subject_name.substring(0, 25), 160, rowY + 5);
    doc.text(String(r.max_marks), 330, rowY + 5);
    doc.text(String(r.marks_obtained), 370, rowY + 5);
    doc.font('Helvetica-Bold').text(r.grade, 435, rowY + 5);
    doc.font('Helvetica').text(String(r.grade_points), 490, rowY + 5);
    rowY += 20;
  });

  doc.rect(60, rowY + 15, 475, 36).fill('#f1f5f9');
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11);
  doc.text(`Semester GPA: ${Number(gpa).toFixed(2)}`, 80, rowY + 26);
  doc.text(`Cumulative CGPA: ${Number(cgpa).toFixed(2)}`, 320, rowY + 26);

  doc.end();
}

module.exports = {
  generateHallTicketPDF,
  generateResultCardPDF,
};
