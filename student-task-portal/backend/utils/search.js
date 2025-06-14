const Task = require('../models/Task');
const Blog = require('../models/Blog');
const User = require('../models/User');

// Search tasks
const searchTasks = async (query, filters = {}) => {
  const searchQuery = {
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } }
    ]
  };

  // Apply filters
  if (filters.category) {
    searchQuery.category = filters.category;
  }
  if (filters.status) {
    searchQuery.status = filters.status;
  }
  if (filters.priority) {
    searchQuery.priority = filters.priority;
  }
  if (filters.assignedTo) {
    searchQuery.assignedTo = filters.assignedTo;
  }

  const tasks = await Task.find(searchQuery)
    .populate('assignedTo', 'name email studentId')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .skip(filters.skip || 0)
    .limit(filters.limit || 10);

  const total = await Task.countDocuments(searchQuery);

  return {
    tasks,
    total,
    page: Math.floor(filters.skip / filters.limit) + 1,
    totalPages: Math.ceil(total / (filters.limit || 10))
  };
};

// Search blog posts
const searchBlogPosts = async (query, filters = {}) => {
  const searchQuery = {
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { content: { $regex: query, $options: 'i' } },
      { metaDescription: { $regex: query, $options: 'i' } }
    ],
    status: 'published'
  };

  // Apply filters
  if (filters.category) {
    searchQuery.category = filters.category;
  }
  if (filters.tags) {
    searchQuery.tags = { $in: filters.tags };
  }
  if (filters.author) {
    searchQuery.author = filters.author;
  }

  const posts = await Blog.find(searchQuery)
    .populate('author', 'name avatar')
    .sort({ publishedAt: -1 })
    .skip(filters.skip || 0)
    .limit(filters.limit || 10);

  const total = await Blog.countDocuments(searchQuery);

  return {
    posts,
    total,
    page: Math.floor(filters.skip / filters.limit) + 1,
    totalPages: Math.ceil(total / (filters.limit || 10))
  };
};

// Search users
const searchUsers = async (query, filters = {}) => {
  const searchQuery = {
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } },
      { studentId: { $regex: query, $options: 'i' } }
    ]
  };

  // Apply filters
  if (filters.role) {
    searchQuery.role = filters.role;
  }
  if (filters.category) {
    searchQuery.category = filters.category;
  }
  if (filters.isActive !== undefined) {
    searchQuery.isActive = filters.isActive;
  }

  const users = await User.find(searchQuery)
    .select('-password')
    .sort({ name: 1 })
    .skip(filters.skip || 0)
    .limit(filters.limit || 10);

  const total = await User.countDocuments(searchQuery);

  return {
    users,
    total,
    page: Math.floor(filters.skip / filters.limit) + 1,
    totalPages: Math.ceil(total / (filters.limit || 10))
  };
};

// Global search across all collections
const globalSearch = async (query, filters = {}) => {
  const [tasks, posts, users] = await Promise.all([
    searchTasks(query, { ...filters, limit: 5 }),
    searchBlogPosts(query, { ...filters, limit: 5 }),
    searchUsers(query, { ...filters, limit: 5 })
  ]);

  return {
    tasks: tasks.tasks,
    posts: posts.posts,
    users: users.users,
    total: tasks.total + posts.total + users.total
  };
};

module.exports = {
  searchTasks,
  searchBlogPosts,
  searchUsers,
  globalSearch
}; 