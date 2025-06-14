const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'student'],
    default: 'student'
  },
  studentId: {
    type: String,
    unique: true,
    sparse: true,
    required: function() {
      return this.role === 'student';
    }
  },
  category: {
    type: String,
    enum: ['Web Development', 'Data Science', 'Mobile Development', 'UI/UX Design'],
    required: function() {
      return this.role === 'student';
    }
  },
  avatar: {
    type: String
  },
  githubProfile: {
    type: String
  },
  linkedinProfile: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

// Generate student ID
userSchema.statics.generateStudentId = async function() {
  const count = await this.countDocuments({ role: 'student' });
  return `S${String(count + 1).padStart(3, '0')}`;
};

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpires;
  return userObject;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 