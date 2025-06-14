const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  metaDescription: {
    type: String,
    required: true,
    maxlength: 160
  },
  category: {
    type: String,
    enum: ['Web Development', 'Data Science', 'Mobile Development', 'UI/UX Design'],
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  featuredImage: {
    url: String,
    alt: String
  },
  views: {
    type: Number,
    default: 0
  },
  publishedAt: {
    type: Date
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for better query performance
blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ category: 1 });
blogSchema.index({ tags: 1 });

// Method to increment views
blogSchema.methods.incrementViews = async function() {
  this.views += 1;
  return this.save();
};

// Method to add comment
blogSchema.methods.addComment = async function(userId, content) {
  this.comments.push({
    user: userId,
    content
  });
  return this.save();
};

// Method to publish post
blogSchema.methods.publish = async function() {
  this.status = 'published';
  this.publishedAt = new Date();
  return this.save();
};

// Method to archive post
blogSchema.methods.archive = async function() {
  this.status = 'archived';
  return this.save();
};

// Static method to get published posts
blogSchema.statics.getPublishedPosts = async function(options = {}) {
  const query = {
    status: 'published',
    publishedAt: { $lte: new Date() }
  };

  if (options.category) {
    query.category = options.category;
  }

  if (options.tags) {
    query.tags = { $in: options.tags };
  }

  return this.find(query)
    .populate('author', 'name avatar')
    .sort({ publishedAt: -1 })
    .limit(options.limit || 10)
    .skip(options.skip || 0);
};

// Static method to get admin posts
blogSchema.statics.getAdminPosts = async function() {
  return this.find()
    .populate('author', 'name')
    .sort({ createdAt: -1 });
};

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog; 