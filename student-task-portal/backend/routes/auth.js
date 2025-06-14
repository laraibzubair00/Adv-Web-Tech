const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

// Student registration
router.post('/student/register', async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    const { studentId, name, email, password, category } = req.body;

    // Check if student ID or email already exists
    const existingUser = await User.findOne({
      $or: [{ studentId }, { email }]
    });

    if (existingUser) {
      console.log('User already exists:', existingUser);
      return res.status(400).json({
        message: existingUser.studentId === studentId
          ? 'Student ID already exists'
          : 'Email already exists'
      });
    }

    // Validate category
    const validCategories = ['Web Development', 'Data Science', 'Mobile Development', 'UI/UX Design'];
    if (!category || !validCategories.includes(category)) {
      console.log('Invalid category:', category);
      return res.status(400).json({
        message: 'Please select a valid category: Web Development, Data Science, Mobile Development, or UI/UX Design'
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

    console.log('Creating new user:', { ...user.toObject(), password: '[REDACTED]' });
    await user.save();
    console.log('User created successfully');

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user._id,
        studentId: user.studentId,
        name: user.name,
        email: user.email,
        role: user.role,
        category: user.category
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Error registering student',
      error: error.message 
    });
  }
});

// Admin login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, role: 'admin' });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });

    user.lastLogin = new Date();
    await user.save();

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Student login
router.post('/student/login', async (req, res) => {
  try {
    const { studentId, password } = req.body;
    const user = await User.findOne({ studentId, role: 'student' });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });

    user.lastLogin = new Date();
    await user.save();

    res.json({
      token,
      user: {
        id: user._id,
        studentId: user.studentId,
        name: user.name,
        role: user.role,
        category: user.category
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk upload students
router.post('/students/bulk', auth, adminAuth, async (req, res) => {
  try {
    console.log('Bulk student upload request received');
    const { students } = req.body;
    const results = {
      created: 0,
      errors: 0
    };

    for (const studentData of students) {
      try {
        // Validate required fields
        if (!studentData.name || !studentData.email || !studentData.password || !studentData.category) {
          console.warn('Missing required fields for student:', studentData);
          results.errors++;
          continue;
        }

        // Validate password length
        if (studentData.password.length < 6) {
          console.warn('Password too short for student:', studentData.email);
          results.errors++;
          continue;
        }

        // Check if student already exists
        const existingStudent = await User.findOne({
          $or: [
            { email: studentData.email },
            { studentId: studentData.studentId }
          ]
        });

        if (existingStudent) {
          console.warn('Student already exists:', studentData.email);
          results.errors++;
          continue;
        }

        // Generate student ID if not provided
        if (!studentData.studentId) {
          studentData.studentId = await User.generateStudentId();
        }

        // Create new student
        const student = new User({
          studentId: studentData.studentId,
          name: studentData.name,
          email: studentData.email,
          password: studentData.password,
          category: studentData.category,
          role: 'student'
        });

        await student.save();
        console.log('Created student:', student.studentId);
        results.created++;
      } catch (error) {
        console.error('Error creating student:', error);
        results.errors++;
      }
    }

    console.log(`Created ${results.created} students, ${results.errors} errors`);
    res.json({
      message: 'Bulk upload completed',
      results
    });
  } catch (error) {
    console.error('Error in bulk upload:', error);
    res.status(500).json({ message: 'Error processing bulk upload' });
  }
});

// Change password
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error changing password' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      studentId: user.studentId,
      category: user.category,
      githubProfile: user.githubProfile,
      linkedinProfile: user.linkedinProfile
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 