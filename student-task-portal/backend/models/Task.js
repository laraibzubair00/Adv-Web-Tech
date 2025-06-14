const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  requirements: [{
    type: String,
    required: true
  }],
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['not started', 'in progress', 'submitted', 'completed', 'rejected'],
    default: 'not started'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  submission: {
    githubLink: String,
    submittedAt: Date
  },
  feedback: String,
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  reviewedAt: Date,
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notifications: [{
    type: {
      type: String,
      enum: ['completion', 'review', 'feedback', 'submission'],
      required: true
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Add indexes for better query performance
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ createdAt: -1 });

// Method to get task statistics
taskSchema.statics.getStats = async function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Method to get tasks by student
taskSchema.statics.getTasksByStudent = async function(studentId) {
  console.log('Getting tasks for student:', studentId);
  
  const tasks = await this.find({ assignedTo: studentId })
    .populate('assignedTo', 'name email studentId')
    .populate('createdBy', 'name')
    .sort({ deadline: 1 });

  console.log('Found tasks:', {
    count: tasks.length,
    tasks: tasks.map(t => ({
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

  return tasks;
};

// Method to get tasks by admin
taskSchema.statics.getTasksByAdmin = async function() {
  return this.find()
    .populate('assignedTo', 'name email studentId')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });
};

// Method to submit task
taskSchema.methods.submitTask = async function(studentId, submission) {
  if (!this.assignedTo.includes(studentId)) {
    throw new Error('Task not assigned to this student');
  }

  this.submission = {
    githubLink: submission.githubLink,
    submittedAt: new Date()
  };
  this.status = 'submitted';

  return this.save();
};

// Method to grade submission
taskSchema.methods.gradeSubmission = async function(score, feedback, status) {
  this.feedback = feedback;
  this.status = status;
  this.reviewedAt = new Date();

  return this.save();
};

const Task = mongoose.model('Task', taskSchema);

module.exports = Task; 