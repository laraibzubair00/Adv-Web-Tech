const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { auth, adminAuth, studentAuth } = require('../middleware/auth');

// Student routes
router.get('/profile', auth, studentAuth, studentController.getProfile);
router.patch('/profile', auth, studentAuth, studentController.updateProfile);
router.get('/dashboard', auth, studentAuth, studentController.getDashboardData);
router.get('/performance', auth, studentAuth, studentController.getPerformance);

// Admin routes
router.get('/admin/all', auth, adminAuth, studentController.getAllStudents);
router.patch('/admin/:studentId/status', auth, adminAuth, studentController.updateStudentStatus);

module.exports = router; 