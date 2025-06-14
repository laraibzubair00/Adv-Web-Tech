const User = require('../models/User');
const Task = require('../models/Task');
const Blog = require('../models/Blog');
const Message = require('../models/Message');

// Get admin dashboard data
const getDashboardData = async (req, res) => {
  try {
    // Get user statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      }
    ]);

    // Get task statistics
    const taskStats = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get category statistics
    const categoryStats = await Task.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent activities
    const recentTasks = await Task.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('assignedTo', 'name')
      .populate('createdBy', 'name');

    const recentBlogs = await Blog.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('author', 'name');

    // Get performance metrics
    const studentPerformance = await User.aggregate([
      {
        $match: { role: 'student' } // Start with all students
      },
      {
        $lookup: {
          from: 'tasks',
          localField: '_id',
          foreignField: 'assignedTo',
          as: 'assignedTasks'
        }
      },
      {
        $addFields: {
          completedTasksCount: {
            $size: {
              $filter: {
                input: '$assignedTasks',
                as: 'task',
                cond: { $eq: ['$$task.status', 'completed'] }
              }
            }
          },
          gradedTasksFilter: {
            $filter: {
              input: '$assignedTasks',
              as: 'task',
              cond: { $and: [
                { $eq: ['$$task.status', 'completed'] },
                { $ne: ['$$task.score', null] },
                { $ne: ['$$task.score', undefined] }
              ]}
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          studentId: 1,
          category: 1,
          totalTasks: { $size: '$assignedTasks' },
          completedTasks: '$completedTasksCount',
          completionRate: {
            $cond: {
              if: { $gt: [{ $size: '$assignedTasks' }, 0] },
              then: { $multiply: [{ $divide: ['$completedTasksCount', { $size: '$assignedTasks' }] }, 100] },
              else: 0
            }
          },
          averageScore: {
            $cond: {
              if: { $gt: [{ $size: '$gradedTasksFilter' }, 0] },
              then: { $avg: '$gradedTasksFilter.score' },
              else: 'N/A'
            }
          }
        }
      },
      {
        $sort: { completionRate: -1, averageScore: -1 } // Sort by completion rate then average score
      }
    ]);

    console.log('Admin Dashboard Student Performance:', JSON.stringify(studentPerformance, null, 2)); // Debugging log

    res.json({
      stats: {
        users: userStats,
        tasks: taskStats,
        categories: categoryStats
      },
      recent: {
        tasks: recentTasks,
        blogs: recentBlogs
      },
      performance: studentPerformance
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
};

// Get admin profile
const getProfile = async (req, res) => {
  try {
    res.json(req.user.getPublicProfile());
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// Update admin profile
const updateProfile = async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['name', 'avatar'];
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

// Get system statistics
const getSystemStats = async (req, res) => {
  try {
    const [userCount, taskCount, blogCount, messageCount] = await Promise.all([
      User.countDocuments(),
      Task.countDocuments(),
      Blog.countDocuments(),
      Message.countDocuments()
    ]);

    const activeUsers = await User.countDocuments({ isActive: true });
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const publishedBlogs = await Blog.countDocuments({ status: 'published' });

    res.json({
      users: {
        total: userCount,
        active: activeUsers
      },
      tasks: {
        total: taskCount,
        completed: completedTasks
      },
      blogs: {
        total: blogCount,
        published: publishedBlogs
      },
      messages: {
        total: messageCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching system statistics' });
  }
};

module.exports = {
  getDashboardData,
  getProfile,
  updateProfile,
  getSystemStats
}; 