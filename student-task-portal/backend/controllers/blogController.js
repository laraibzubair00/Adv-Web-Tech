const Blog = require('../models/Blog');
const { sendEmail } = require('../utils/email');

// Create new blog post
const createPost = async (req, res) => {
  try {
    const post = new Blog({
      ...req.body,
      author: req.user._id
    });

    await post.save();
    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ message: 'Error creating blog post' });
  }
};

// Get all posts (admin)
const getAllPosts = async (req, res) => {
  try {
    const posts = await Blog.find()
      .populate('author', 'name')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching posts' });
  }
};

// Get published posts
const getPublishedPosts = async (req, res) => {
  try {
    const posts = await Blog.find({ status: 'published' })
      .populate('author', 'name')
      .sort({ publishedAt: -1 });

    res.json({ blogs: posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Error fetching posts' });
  }
};

// Get post by ID
const getPostById = async (req, res) => {
  try {
    const post = await Blog.findById(req.params.id)
      .populate('author', 'name');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Increment views for published posts
    if (post.status === 'published') {
      await post.incrementViews();
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching post' });
  }
};

// Update post
const updatePost = async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['title', 'content', 'metaDescription', 'category', 'tags', 'status', 'featuredImage'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).json({ message: 'Invalid updates' });
  }

  try {
    const post = await Blog.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Only author or admin can update post
    if (req.user.role !== 'admin' && post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    updates.forEach(update => post[update] = req.body[update]);

    // Handle status change
    if (updates.includes('status') && req.body.status === 'published') {
      await post.publish();
    } else if (updates.includes('status') && req.body.status === 'archived') {
      await post.archive();
    }

    await post.save();
    res.json(post);
  } catch (error) {
    res.status(400).json({ message: 'Error updating post' });
  }
};

// Delete post
const deletePost = async (req, res) => {
  try {
    const post = await Blog.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Only author or admin can delete post
    if (req.user.role !== 'admin' && post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await post.remove();
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting post' });
  }
};

// Add comment
const addComment = async (req, res) => {
  try {
    const post = await Blog.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Only published posts can have comments
    if (post.status !== 'published') {
      return res.status(400).json({ message: 'Cannot comment on unpublished post' });
    }

    const comment = {
      user: req.user._id,
      content: req.body.content
    };

    await post.addComment(comment);

    // Notify author
    if (post.author.toString() !== req.user._id.toString()) {
      const author = await User.findById(post.author);
      if (author) {
        await sendEmail({
          to: author.email,
          subject: 'New Comment on Your Post',
          text: `Someone commented on your post: ${post.title}`
        });
      }
    }

    res.json(post);
  } catch (error) {
    res.status(400).json({ message: 'Error adding comment' });
  }
};

// Get post statistics
const getPostStats = async (req, res) => {
  try {
    const stats = await Blog.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const categoryStats = await Blog.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    const viewStats = await Blog.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' },
          avgViews: { $avg: '$views' }
        }
      }
    ]);

    res.json({
      statusStats: stats,
      categoryStats,
      viewStats: viewStats[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching post statistics' });
  }
};

module.exports = {
  createPost,
  getAllPosts,
  getPublishedPosts,
  getPostById,
  updatePost,
  deletePost,
  addComment,
  getPostStats
}; 