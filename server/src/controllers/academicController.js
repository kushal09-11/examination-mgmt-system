const academicService = require('../services/academicService');
const { courseSchema, subjectSchema, studentUpdateSchema, facultyAssignmentSchema } = require('../validators/academicValidator');

// Courses
async function getCourses(req, res, next) {
  try {
    const courses = await academicService.getAllCourses();
    res.json({ success: true, data: courses });
  } catch (err) {
    next(err);
  }
}

async function createCourse(req, res, next) {
  try {
    const validated = courseSchema.parse(req.body);
    const course = await academicService.createCourse(validated, req.user.user_id, req);
    res.status(201).json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
}

async function updateCourse(req, res, next) {
  try {
    const validated = courseSchema.partial().parse(req.body);
    const course = await academicService.updateCourse(Number(req.params.id), validated, req.user.user_id, req);
    res.json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
}

// Subjects
async function getSubjects(req, res, next) {
  try {
    const subjects = await academicService.getAllSubjects(req.query);
    res.json({ success: true, data: subjects });
  } catch (err) {
    next(err);
  }
}

async function createSubject(req, res, next) {
  try {
    const validated = subjectSchema.parse(req.body);
    const subject = await academicService.createSubject(validated, req.user.user_id, req);
    res.status(201).json({ success: true, data: subject });
  } catch (err) {
    next(err);
  }
}

async function updateSubject(req, res, next) {
  try {
    const validated = subjectSchema.partial().parse(req.body);
    const subject = await academicService.updateSubject(Number(req.params.id), validated, req.user.user_id, req);
    res.json({ success: true, data: subject });
  } catch (err) {
    next(err);
  }
}

// Faculty-Subject Assignments
async function assignFaculty(req, res, next) {
  try {
    const validated = facultyAssignmentSchema.parse(req.body);
    const assignment = await academicService.assignFacultyToSubject(validated, req.user.user_id, req);
    res.json({ success: true, data: assignment });
  } catch (err) {
    next(err);
  }
}

async function removeFacultyAssignment(req, res, next) {
  try {
    const { facultyId, subjectId } = req.params;
    await academicService.removeFacultyFromSubject(Number(facultyId), Number(subjectId), req.user.user_id, req);
    res.json({ success: true, message: 'Faculty unassigned successfully.' });
  } catch (err) {
    next(err);
  }
}

// Students
async function getStudents(req, res, next) {
  try {
    const result = await academicService.getStudents(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function getStudentById(req, res, next) {
  try {
    const student = await academicService.getStudentById(Number(req.params.id));
    res.json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
}

async function updateStudent(req, res, next) {
  try {
    const validated = studentUpdateSchema.parse(req.body);
    const student = await academicService.updateStudent(Number(req.params.id), validated, req.user.user_id, req);
    res.json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
}

async function deactivateStudent(req, res, next) {
  try {
    const student = await academicService.deactivateStudent(Number(req.params.id), req.user.user_id, req);
    res.json({ success: true, message: 'Student deactivated. Historical exam records preserved.', data: student });
  } catch (err) {
    next(err);
  }
}

// Faculty
async function getFaculty(req, res, next) {
  try {
    const faculty = await academicService.getAllFaculty();
    res.json({ success: true, data: faculty });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCourses,
  createCourse,
  updateCourse,
  getSubjects,
  createSubject,
  updateSubject,
  assignFaculty,
  removeFacultyAssignment,
  getStudents,
  getStudentById,
  updateStudent,
  deactivateStudent,
  getFaculty,
};
