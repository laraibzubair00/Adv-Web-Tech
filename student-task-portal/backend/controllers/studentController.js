const User = require('../models/User');
const Task = require('../models/Task');
const { sendEmail } = require('../utils/email');

// Get student profile
const getProfile = async (req, res) => {
  try {
    res.json(req.user.getPublicProfile());
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// Update student profile
const updateProfile = async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['name', 'avatar', 'githubProfile', 'linkedinProfile'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).json({ message: 'Invalid updates' });
  }

  try {
    updates.forEach(update => req.user[update] = req.body[update]);
    await req.user.save();
    res.json(req.user.getPublicProfile());
  } catch (error) {
    res.status(400).json({ message: 'Error updating profile' });
  }
};

// Get student dashboard data
const getDashboardData = async (req, res) => {
  try {
    console.log('Fetching dashboard data for student:', req.user._id);
    
    // Get tasks
    const tasks = await Task.find({ assignedTo: req.user._id })
      .sort({ deadline: 1 })
      .limit(5);

    // Get task statistics
    const taskStats = await Task.aggregate([
      {
        $match: { assignedTo: req.user._id }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate performance metrics
    const completedTasks = await Task.find({
      assignedTo: req.user._id,
      status: 'completed'
    });

    const gradedTasks = completedTasks.filter(task => task.score !== null && task.score !== undefined);

    const totalScore = gradedTasks.reduce((sum, task) => {
      return sum + (task.score || 0);
    }, 0);

    const averageScore = gradedTasks.length > 0 ? totalScore / gradedTasks.length : 0;

    const onTimeSubmissions = completedTasks.filter(task => {
      const completionTimestamp = task.reviewedAt || task.completedAt; // Prioritize admin review timestamp
      return completionTimestamp && completionTimestamp <= task.deadline;
    });

    const onTimeRate = completedTasks.length > 0
      ? (onTimeSubmissions.length / completedTasks.length) * 100
      : 0;

    console.log('Dashboard data prepared:', {
      tasksCount: tasks.length,
      stats: taskStats,
      performance: {
        averageScore,
        onTimeRate,
        tasksCompleted: completedTasks.length
      }
    });

    res.json({
      tasks,
      stats: {
        totalTasks: taskStats.reduce((sum, stat) => sum + stat.count, 0),
        completedTasks: taskStats.find(stat => stat._id === 'completed')?.count || 0,
        inProgressTasks: taskStats.find(stat => stat._id === 'in progress')?.count || 0,
        notStartedTasks: taskStats.find(stat => stat._id === 'not started')?.count || 0
      },
      performance: {
        averageScore,
        onTimeRate,
        tasksCompleted: completedTasks.length
      }
    });
  } catch (error) {
    console.error('Error in getDashboardData:', error);
    res.status(500).json({ 
      message: 'Error fetching dashboard data',
      error: error.message 
    });
  }
};

// Get student performance
const getPerformance = async (req, res) => {
  try {
    const tasks = await Task.find({
      assignedTo: req.user._id,
      'submissions.status': 'graded'
    }).populate('createdBy', 'name');

    const performance = tasks.map(task => {
      const submission = task.submissions.find(sub => sub.student.toString() === req.user._id.toString());
      return {
        task: {
          id: task._id,
          title: task.title,
          category: task.category
        },
        score: submission ? submission.score : 0,
        submittedAt: submission ? submission.submittedAt : null,
        deadline: task.deadline,
        feedback: submission ? submission.feedback : null
      };
    });

    res.json(performance);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching performance data' });
  }
};

// Get all students (admin only)
const getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('-password')
      .sort({ name: 1 });
    
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching students' });
  }
};

// Update student status (admin only)
const updateStudentStatus = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { isActive } = req.body;

    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    student.isActive = isActive;
    await student.save();

    // Notify student
    await sendEmail({
      to: student.email,
      subject: 'Account Status Update',
      text: `Your account has been ${isActive ? 'activated' : 'deactivated'}`
    });

    res.json(student.getPublicProfile());
  } catch (error) {
    res.status(500).json({ message: 'Error updating student status' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getDashboardData,
  getPerformance,
  getAllStudents,
  updateStudentStatus
}; 