const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { auth, adminAuth, studentAuth } = require('../middleware/auth');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const User = require('../models/User');

// Admin routes
router.post('/', auth, adminAuth, async (req, res) => {
  try {
    const { title, description, deadline, category, requirements, assignedTo, priority } = req.body;
    
    // Validate required fields
    if (!title || !description || !deadline || !category || !assignedTo || !assignedTo.length) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['title', 'description', 'deadline', 'category', 'assignedTo']
      });
    }

    // Create new task
    const task = new Task({
      title,
      description,
      deadline: new Date(deadline),
      category,
      requirements: Array.isArray(requirements) ? requirements : requirements.split('\n').filter(req => req.trim()),
      assignedTo,
      priority: priority || 'medium',
      status: 'not started',
      createdBy: req.user._id
    });

    const savedTask = await task.save();
    
    // Populate the task before sending response
    const populatedTask = await Task.findById(savedTask._id)
      .populate('assignedTo', 'name studentId')
      .populate('createdBy', 'name');

    res.status(201).json(populatedTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Error creating task' });
  }
});

router.get('/admin/all', auth, adminAuth, taskController.getAllTasks);
router.get('/admin/stats', auth, adminAuth, taskController.getTaskStats);
router.patch('/:id', auth, adminAuth, taskController.updateTask);
router.delete('/:taskId', auth, adminAuth, async (req, res) => {
  const taskId = req.params.taskId;
  console.log('Delete task request received:', {
    taskId: taskId,
    user: req.user,
    isAdmin: req.user.role === 'admin'
  });

  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Validate taskId format
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      console.log('Invalid task ID format:', taskId);
      return res.status(400).json({ message: 'Invalid task ID format' });
    }

    // First check if task exists
    const task = await Task.findById(taskId);
    if (!task) {
      console.log('Task not found:', taskId);
      return res.status(404).json({ message: 'Task not found' });
    }

    console.log('Found task to delete:', {
      id: task._id,
      title: task.title,
      status: task.status
    });

    // Delete associated notifications first
    try {
      const notificationResult = await Notification.deleteMany({ task: taskId });
      console.log('Deleted notifications:', notificationResult);
    } catch (notificationError) {
      console.error('Error deleting notifications:', notificationError);
      // Continue with task deletion even if notification deletion fails
    }

    // Delete the task
    const deleteResult = await Task.findByIdAndDelete(taskId);
    console.log('Task deletion result:', deleteResult);

    if (!deleteResult) {
      console.error('Task deletion failed - no document was deleted');
      return res.status(500).json({ message: 'Failed to delete task' });
    }

    console.log('Task deleted successfully:', taskId);
    return res.json({ 
      message: 'Task deleted successfully',
      taskId: taskId
    });

  } catch (error) {
    console.error('Error in delete task route:', error);
    res.status(500).json({ 
      message: 'Error deleting task',
      error: error.message
    });
  }
});

// Student routes
router.get('/student', auth, studentAuth, async (req, res) => {
  try {
    console.log('Student details:', {
      id: req.user._id,
      role: req.user.role,
      name: req.user.name
    });

    // First check if student exists
    const student = await User.findById(req.user._id);
    if (!student) {
      console.log('Student not found');
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get tasks assigned to student
    const tasks = await Task.find({ assignedTo: req.user._id })
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name studentId')
      .sort({ createdAt: -1 });

    console.log('Found tasks:', {
      count: tasks.length,
      tasks: tasks.map(t => ({
        id: t._id,
        title: t.title,
        status: t.status,
        assignedTo: t.assignedTo.map(s => s._id)
      }))
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching student tasks:', error);
    res.status(500).json({ 
      message: 'Error fetching tasks',
      error: error.message 
    });
  }
});

router.post('/:taskId/submit', auth, async (req, res) => {
  try {
    const { githubLink } = req.body;
    console.log('Received GitHub link for submission:', githubLink);

    // Temporarily comment out for debugging:
    // if (!githubLink) {
    //   return res.status(400).json({ message: 'GitHub link is required' });
    // }

    const task = await Task.findOne({
      _id: req.params.taskId,
      assignedTo: req.user._id
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.submission = {
      githubLink,
      submittedAt: new Date()
    };
    task.status = 'submitted';

    // Add notification for admin
    task.notifications = task.notifications || [];
    task.notifications.push({
      type: 'submission',
      message: `Task "${task.title}" has been submitted by ${req.user.name} with GitHub link: ${githubLink}`,
      timestamp: new Date(),
      read: false
    });

    await task.save();
    res.json(task);
  } catch (error) {
    console.error('Error submitting task:', error);
    res.status(500).json({ message: 'Error submitting task' });
  }
});

// Common routes
router.get('/:id', auth, taskController.getTaskById);

// Get all tasks (admin only)
router.get('/admin/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const tasks = await Task.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name studentId');
    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching all tasks:', error);
    res.status(500).json({ message: 'Error fetching tasks' });
  }
});

// Review task (admin only)
router.post('/:taskId/review', auth, adminAuth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const { status, feedback, score } = req.body;
    if (!['completed', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    task.status = status;
    task.feedback = feedback;
    task.reviewedAt = new Date();
    if (score !== undefined) {
      task.score = score;
    }

    await task.save();

    // Create notification for student
    const notification = new Notification({
      task: task._id,
      student: task.assignedTo,
      message: `Your task "${task.title}" has been ${status}`,
      type: 'task_review'
    });
    await notification.save();

    res.json({ message: 'Task reviewed successfully', task });
  } catch (error) {
    console.error('Error reviewing task:', error);
    res.status(500).json({ message: 'Error reviewing task' });
  }
});

// Mark task as complete (student only)
router.post('/:taskId/complete', auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.taskId,
      assignedTo: req.user._id
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Update task status and add completion timestamp
    task.status = 'completed';
    task.completedAt = new Date();
    task.completedBy = req.user._id;

    // Add a notification for admin
    task.notifications = task.notifications || [];
    task.notifications.push({
      type: 'completion',
      message: `Task "${task.title}" has been marked as complete by ${req.user.name}`,
      timestamp: new Date(),
      read: false
    });

    await task.save();

    // Populate the task with student details before sending response
    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name studentId')
      .populate('createdBy', 'name');

    res.json(populatedTask);
  } catch (error) {
    console.error('Error marking task as complete:', error);
    res.status(500).json({ message: 'Error marking task as complete' });
  }
});

// Get task notifications for admin
router.get('/admin/notifications', auth, adminAuth, async (req, res) => {
  try {
    const tasks = await Task.find({
      'notifications.read': false,
      createdBy: req.user._id
    })
    .populate('assignedTo', 'name studentId')
    .select('title notifications status completedAt completedBy');

    const notifications = tasks.flatMap(task => 
      task.notifications
        .filter(n => !n.read)
        .map(n => ({
          taskId: task._id,
          taskTitle: task.title,
          student: task.assignedTo,
          message: n.message,
          timestamp: n.timestamp,
          status: task.status,
          completedAt: task.completedAt
        }))
    );

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Mark notification as read
router.patch('/admin/notifications/:taskId', auth, adminAuth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.notifications = task.notifications.map(n => ({
      ...n,
      read: true
    }));

    await task.save();
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ message: 'Error marking notifications as read' });
  }
});

// Start task route
router.post('/:taskId/start', auth, studentAuth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!task.assignedTo.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to start this task' });
    }

    if (task.status !== 'not started') {
      return res.status(400).json({ message: 'Task is already in progress or completed' });
    }

    task.status = 'in progress';
    await task.save();

    res.json({ message: 'Task started successfully', task });
  } catch (error) {
    console.error('Error starting task:', error);
    res.status(500).json({ message: 'Error starting task' });
  }
});

// Update task route
router.put('/:taskId', auth, adminAuth, async (req, res) => {
  try {
    console.log('Update task request received:', {
      taskId: req.params.taskId,
      user: req.user,
      isAdmin: req.user.role === 'admin'
    });

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Validate required fields
    const { title, description, deadline, category, requirements, priority, assignedTo } = req.body;
    if (!title || !description || !deadline || !category || !assignedTo) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Update task fields
    task.title = title;
    task.description = description;
    task.deadline = new Date(deadline);
    task.category = category;
    task.requirements = Array.isArray(requirements) ? requirements : requirements.split('\n').filter(req => req.trim());
    task.priority = priority || 'medium';
    task.assignedTo = assignedTo;

    await task.save();

    // Populate the task before sending response
    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name studentId');

    res.json({ message: 'Task updated successfully', task: populatedTask });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Error updating task', error: error.message });
  }
});

// Export data route
router.get('/admin/export', auth, adminAuth, async (req, res) => {
  try {
    console.log('Export request received');
    
    // Get all tasks with populated data
    const tasks = await Task.find()
      .populate('assignedTo', 'name email studentId')
      .populate('createdBy', 'name')
      .lean();

    // Get all students
    const students = await User.find({ role: 'student' })
      .select('-password')
      .lean();

    // Format the data for export
    const exportData = {
      tasks: tasks.map(task => ({
        id: task._id,
        title: task.title,
        description: task.description,
        deadline: task.deadline,
        category: task.category,
        status: task.status,
        priority: task.priority,
        requirements: task.requirements,
        assignedTo: task.assignedTo.map(student => ({
          id: student._id,
          name: student.name,
          email: student.email,
          studentId: student.studentId
        })),
        createdBy: task.createdBy ? {
          id: task.createdBy._id,
          name: task.createdBy.name
        } : null,
        submission: task.submission,
        feedback: task.feedback,
        reviewedAt: task.reviewedAt,
        completedAt: task.completedAt
      })),
      students: students.map(student => ({
        id: student._id,
        name: student.name,
        email: student.email,
        studentId: student.studentId,
        category: student.category
      }))
    };

    console.log('Export data prepared successfully');
    res.json(exportData);
  } catch (error) {
    console.error('Error in export route:', error);
    res.status(500).json({ 
      message: 'Error exporting data',
      error: error.message
    });
  }
});

// Get tasks for a specific student
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    console.log('Fetching tasks for student:', studentId);
    
    // Verify the student exists
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const tasks = await Task.find({
      assignedTo: studentId
    })
    .populate('assignedTo', 'name studentId')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });

    console.log('Found tasks:', tasks.length);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching student tasks:', error);
    res.status(500).json({ 
      message: 'Error fetching tasks',
      error: error.message 
    });
  }
});

// Debug route to check tasks
router.get('/debug/tasks', auth, async (req, res) => {
  try {
    console.log('Debug: Checking all tasks in database');
    
    // Get all tasks
    const allTasks = await Task.find()
      .populate('assignedTo', 'name studentId')
      .populate('createdBy', 'name');
    
    console.log('All tasks in database:', {
      total: allTasks.length,
      tasks: allTasks.map(t => ({
        id: t._id,
        title: t.title,
        status: t.status,
        assignedTo: t.assignedTo.map(s => ({
          id: s._id,
          name: s.name,
          studentId: s.studentId
        }))
      }))
    });

    // Get tasks for current user
    const userTasks = await Task.find({ assignedTo: req.user._id })
      .populate('assignedTo', 'name studentId')
      .populate('createdBy', 'name');

    console.log('Tasks for current user:', {
      userId: req.user._id,
      role: req.user.role,
      count: userTasks.length,
      tasks: userTasks.map(t => ({
        id: t._id,
        title: t.title,
        status: t.status
      }))
    });

    res.json({
      allTasks: allTasks.length,
      userTasks: userTasks.length,
      user: {
        id: req.user._id,
        role: req.user.role,
        name: req.user.name
      }
    });
  } catch (error) {
    console.error('Debug route error:', error);
    res.status(500).json({ 
      message: 'Error in debug route',
      error: error.message 
    });
  }
});

// Test route to create a task
router.post('/test/create', auth, adminAuth, async (req, res) => {
  try {
    console.log('Creating test task');
    
    // Get a student user
    const student = await User.findOne({ role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'No student found to assign task to' });
    }

    console.log('Found student:', {
      id: student._id,
      name: student.name,
      role: student.role
    });

    // Create a test task
    const task = new Task({
      title: 'Test Task',
      description: 'This is a test task',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      category: 'Test',
      requirements: ['Test requirement 1', 'Test requirement 2'],
      assignedTo: [student._id],
      createdBy: req.user._id,
      status: 'not started',
      priority: 'medium'
    });

    await task.save();
    console.log('Test task created:', {
      id: task._id,
      title: task.title,
      assignedTo: task.assignedTo
    });

    res.json({ message: 'Test task created', task });
  } catch (error) {
    console.error('Error creating test task:', error);
    res.status(500).json({ 
      message: 'Error creating test task',
      error: error.message 
    });
  }
});

router.patch('/:taskId/status', auth, studentAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const taskId = req.params.taskId;

    // Validate status update: only allow changing to 'in progress' from 'not started'
    if (status !== 'in progress') {
      return res.status(400).json({ message: 'Invalid status update' });
    }

    const task = await Task.findOne({
      _id: taskId,
      assignedTo: req.user._id,
      status: 'not started' // Only allow changing from 'not started'
    });

    if (!task) {
      // Task not found, not assigned to user, or not in 'not started' status
      return res.status(404).json({ message: 'Task not found or cannot be updated' });
    }

    task.status = status;
    await task.save();

    res.json(task);
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ message: 'Error updating task status' });
  }
});

// Get notifications for admin
router.get('/notifications', auth, adminAuth, async (req, res) => {
  try {
    const tasks = await Task.find({
      'notifications.type': 'submission',
      'notifications.read': false
    })
    .populate('assignedTo', 'name')
    .sort({ 'notifications.timestamp': -1 });

    const notifications = tasks.flatMap(task => 
      task.notifications
        .filter(n => n.type === 'submission' && !n.read)
        .map(n => ({
          _id: n._id,
          taskId: task._id,
          message: n.message,
          timestamp: n.timestamp,
          read: n.read
        }))
    );

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

module.exports = router; 