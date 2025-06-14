const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { auth, adminAuth } = require('../middleware/auth');

// Student routes
router.get('/profile', auth, studentController.getProfile);
router.patch('/profile', auth, studentController.updateProfile);
router.get('/dashboard', auth, studentController.getDashboardData);
router.get('/performance', auth, studentController.getPerformance);

// Admin routes for student management
router.get('/', auth, adminAuth, studentController.getAllStudents);
router.patch('/:studentId/status', auth, adminAuth, studentController.updateStudentStatus);

module.exports = router; 