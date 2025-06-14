const Task = require('../models/Task');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');

// Create new task
const createTask = async (req, res) => {
  try {
    const { title, description, category, deadline, requirements, assignedTo, priority } = req.body;

    // Validate assigned students
    const students = await User.find({
      _id: { $in: assignedTo },
      role: 'student',
      isActive: true
    });

    if (students.length !== assignedTo.length) {
      return res.status(400).json({ message: 'One or more assigned students are invalid' });
    }

    const task = new Task({
      title,
      description,
      category,
      deadline,
      requirements,
      assignedTo,
      priority,
      createdBy: req.user._id
    });

    await task.save();

    // Notify assigned students
    for (const student of students) {
      await sendEmail({
        to: student.email,
        subject: 'New Task Assigned',
        text: `You have been assigned a new task: ${title}`
      });
    }

    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: 'Error creating task' });
  }
};

// Get all tasks (admin)
const getAllTasks = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email studentId')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(query);

    res.json({
      tasks,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks' });
  }
};

// Get task statistics
const getTaskStats = async (req, res) => {
  try {
    const stats = await Task.getStats();
    const categoryStats = await Task.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    const deadlineStats = await Task.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $lt: ['$deadline', new Date()] },
              'overdue',
              {
                $cond: [
                  { $lt: ['$deadline', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)] },
                  'upcoming',
                  'future'
                ]
              }
            ]
          },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      statusStats: stats,
      categoryStats,
      deadlineStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching task statistics' });
  }
};

// Update task
const updateTask = async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['title', 'description', 'category', 'deadline', 'requirements', 'assignedTo', 'priority', 'status'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).json({ message: 'Invalid updates' });
  }

  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if assigned students are valid
    if (updates.includes('assignedTo')) {
      const students = await User.find({
        _id: { $in: req.body.assignedTo },
        role: 'student',
        isActive: true
      });

      if (students.length !== req.body.assignedTo.length) {
        return res.status(400).json({ message: 'One or more assigned students are invalid' });
      }
    }

    updates.forEach(update => task[update] = req.body[update]);
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(400).json({ message: 'Error updating task' });
  }
};

// Delete task
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await task.remove();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task' });
  }
};

// Grade submission
const gradeSubmission = async (req, res) => {
  try {
    const { submissionId, score, feedback, status } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await task.gradeSubmission(submissionId, score, feedback, status);

    // Notify student
    const submission = task.submissions.id(submissionId);
    const student = await User.findById(submission.student);
    
    if (student) {
      await sendEmail({
        to: student.email,
        subject: 'Task Submission Graded',
        text: `Your submission for task "${task.title}" has been graded. Score: ${score}`
      });
    }

    res.json(task);
  } catch (error) {
    res.status(400).json({ message: 'Error grading submission' });
  }
};

// Get student tasks
const getStudentTasks = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { assignedTo: req.user._id };

    if (status) query.status = status;

    const tasks = await Task.find(query)
      .populate('createdBy', 'name')
      .sort({ deadline: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(query);

    res.json({
      tasks,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks' });
  }
};

// Submit task
const submitTask = async (req, res) => {
  try {
    const { submission, comments } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if student is assigned to task
    if (!task.assignedTo.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are not assigned to this task' });
    }

    await task.submitTask(req.user._id, submission, comments);

    // Notify admin
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      await sendEmail({
        to: admin.email,
        subject: 'New Task Submission',
        text: `Student ${req.user.name} has submitted task: ${task.title}`
      });
    }

    res.json(task);
  } catch (error) {
    res.status(400).json({ message: 'Error submitting task' });
  }
};

// Get task by ID
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email studentId')
      .populate('createdBy', 'name');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to task
    if (req.user.role === 'student' && !task.assignedTo.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching task' });
  }
};

module.exports = {
  createTask,
  getAllTasks,
  getTaskStats,
  updateTask,
  deleteTask,
  gradeSubmission,
  getStudentTasks,
  submitTask,
  getTaskById
}; 