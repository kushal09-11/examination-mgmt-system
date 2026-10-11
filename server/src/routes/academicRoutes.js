const express = require('express');
const router = express.Router();
const academicController = require('../controllers/academicController');
const { authenticate, authorize } = require('../middleware/auth');

// Protected for all authenticated users to read courses & subjects
router.get('/courses', authenticate, academicController.getCourses);
router.post('/courses', authenticate, authorize('Admin'), academicController.createCourse);
router.put('/courses/:id', authenticate, authorize('Admin'), academicController.updateCourse);

router.get('/subjects', authenticate, academicController.getSubjects);
router.post('/subjects', authenticate, authorize('Admin'), academicController.createSubject);
router.put('/subjects/:id', authenticate, authorize('Admin'), academicController.updateSubject);

// Faculty assignments
router.post('/faculty-assignments', authenticate, authorize('Admin'), academicController.assignFaculty);
router.delete('/faculty-assignments/:facultyId/:subjectId', authenticate, authorize('Admin'), academicController.removeFacultyAssignment);

// Students
router.get('/students', authenticate, authorize('Admin', 'Faculty', 'Examiner'), academicController.getStudents);
router.get('/students/:id', authenticate, academicController.getStudentById);
router.put('/students/:id', authenticate, authorize('Admin'), academicController.updateStudent);
router.delete('/students/:id/deactivate', authenticate, authorize('Admin'), academicController.deactivateStudent);

// Faculty
router.get('/faculty', authenticate, authorize('Admin', 'Examiner'), academicController.getFaculty);

module.exports = router;
