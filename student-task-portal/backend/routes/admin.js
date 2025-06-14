const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, adminAuth } = require('../middleware/auth');
const User = require('../models/User');
const Task = require('../models/Task');

// All routes require admin authentication
router.use(auth, adminAuth);

// Admin routes
router.get('/dashboard', adminController.getDashboardData);
router.get('/profile', adminController.getProfile);
router.patch('/profile', adminController.updateProfile);
router.get('/stats', adminController.getSystemStats);

// Get all students
router.get('/students', auth, adminAuth, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Error fetching students' });
  }
});

// Add a single student manually
router.post('/students', auth, adminAuth, async (req, res) => {
  try {
    console.log('Adding new student:', req.body);
    const { studentId, name, email, password, category } = req.body;

    if (!studentId || !name || !email || !password || !category) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if student ID or email already exists
    const existingUser = await User.findOne({
      $or: [{ studentId }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.studentId === studentId
          ? 'Student ID already exists'
          : 'Email already exists'
      });
    }

    // Create new student
    const user = new User({
      studentId,
      name,
      email,
      password,
      role: 'student',
      category
    });

    await user.save();
    console.log('Student added successfully:', user._id);

    res.status(201).json({
      message: 'Student added successfully',
      user: {
        id: user._id,
        studentId: user.studentId,
        name: user.name,
        email: user.email,
        category: user.category
      }
    });
  } catch (error) {
    console.error('Error in POST /students:', error);
    res.status(500).json({ message: 'Error adding student', error: error.message });
  }
});

// Export student data
router.get('/export', auth, adminAuth, async (req, res) => {
  try {
    // Get all students with their tasks
    const students = await User.find({ role: 'student' })
      .select('-password')
      .lean();

    // Get all tasks
    const tasks = await Task.find().lean();

    // Create export data
    const exportData = students.map(student => {
      // Get tasks assigned to this student
      const studentTasks = tasks.filter(task => 
        task.assignedTo.includes(student._id.toString())
      );

      return {
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        category: student.category,
        isActive: student.isActive,
        createdAt: student.createdAt,
        tasks: studentTasks.map(task => ({
          title: task.title,
          status: task.status,
          deadline: task.deadline,
          category: task.category,
          priority: task.priority
        }))
      };
    });

    res.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ message: 'Error exporting data' });
  }
});

module.exports = router; 