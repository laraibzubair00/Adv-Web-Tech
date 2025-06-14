const { validationResult, check } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// User validation rules
const userValidationRules = {
  register: [
    check('name').trim().notEmpty().withMessage('Name is required'),
    check('email').isEmail().withMessage('Invalid email address'),
    check('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/\d/)
      .withMessage('Password must contain a number')
      .matches(/[A-Z]/)
      .withMessage('Password must contain an uppercase letter'),
    check('role').isIn(['admin', 'student']).withMessage('Invalid role'),
    check('category')
      .if(check('role').equals('student'))
      .isIn(['Web Development', 'Data Science', 'Mobile Development', 'UI/UX Design'])
      .withMessage('Invalid category')
  ],
  login: [
    check('email').isEmail().withMessage('Invalid email address'),
    check('password').notEmpty().withMessage('Password is required')
  ],
  updateProfile: [
    check('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    check('githubProfile').optional().isURL().withMessage('Invalid GitHub profile URL'),
    check('linkedinProfile').optional().isURL().withMessage('Invalid LinkedIn profile URL')
  ],
  changePassword: [
    check('currentPassword').notEmpty().withMessage('Current password is required'),
    check('newPassword')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/\d/)
      .withMessage('Password must contain a number')
      .matches(/[A-Z]/)
      .withMessage('Password must contain an uppercase letter')
  ]
};

// Task validation rules
const taskValidationRules = {
  create: [
    check('title').trim().notEmpty().withMessage('Title is required'),
    check('description').trim().notEmpty().withMessage('Description is required'),
    check('category')
      .isIn(['Web Development', 'Data Science', 'Mobile Development', 'UI/UX Design'])
      .withMessage('Invalid category'),
    check('deadline').isISO8601().withMessage('Invalid deadline date'),
    check('requirements').isArray().withMessage('Requirements must be an array'),
    check('requirements.*').trim().notEmpty().withMessage('Requirement cannot be empty'),
    check('assignedTo').isArray().withMessage('Assigned students must be an array'),
    check('assignedTo.*').isMongoId().withMessage('Invalid student ID'),
    check('priority').isIn(['low', 'medium', 'high']).withMessage('Invalid priority')
  ],
  update: [
    check('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    check('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
    check('category')
      .optional()
      .isIn(['Web Development', 'Data Science', 'Mobile Development', 'UI/UX Design'])
      .withMessage('Invalid category'),
    check('deadline').optional().isISO8601().withMessage('Invalid deadline date'),
    check('requirements').optional().isArray().withMessage('Requirements must be an array'),
    check('requirements.*').optional().trim().notEmpty().withMessage('Requirement cannot be empty'),
    check('assignedTo').optional().isArray().withMessage('Assigned students must be an array'),
    check('assignedTo.*').optional().isMongoId().withMessage('Invalid student ID'),
    check('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
    check('status').optional().isIn(['not started', 'in progress', 'completed']).withMessage('Invalid status')
  ],
  submit: [
    check('submission').trim().notEmpty().withMessage('Submission is required'),
    check('comments').optional().trim()
  ],
  grade: [
    check('submissionId').isMongoId().withMessage('Invalid submission ID'),
    check('score').isInt({ min: 0, max: 100 }).withMessage('Score must be between 0 and 100'),
    check('feedback').optional().trim(),
    check('status').isIn(['approved', 'rejected']).withMessage('Invalid status')
  ]
};

// Blog validation rules
const blogValidationRules = {
  create: [
    check('title').trim().notEmpty().withMessage('Title is required'),
    check('content').trim().notEmpty().withMessage('Content is required'),
    check('metaDescription')
      .trim()
      .notEmpty()
      .withMessage('Meta description is required')
      .isLength({ max: 160 })
      .withMessage('Meta description must be less than 160 characters'),
    check('category')
      .isIn(['Web Development', 'Data Science', 'Mobile Development', 'UI/UX Design'])
      .withMessage('Invalid category'),
    check('tags').optional().isArray().withMessage('Tags must be an array'),
    check('tags.*').optional().trim().notEmpty().withMessage('Tag cannot be empty'),
    check('status').isIn(['draft', 'published', 'archived']).withMessage('Invalid status')
  ],
  update: [
    check('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    check('content').optional().trim().notEmpty().withMessage('Content cannot be empty'),
    check('metaDescription')
      .optional()
      .trim()
      .isLength({ max: 160 })
      .withMessage('Meta description must be less than 160 characters'),
    check('category')
      .optional()
      .isIn(['Web Development', 'Data Science', 'Mobile Development', 'UI/UX Design'])
      .withMessage('Invalid category'),
    check('tags').optional().isArray().withMessage('Tags must be an array'),
    check('tags.*').optional().trim().notEmpty().withMessage('Tag cannot be empty'),
    check('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status')
  ],
  comment: [
    check('content').trim().notEmpty().withMessage('Comment content is required')
  ]
};

// Message validation rules
const messageValidationRules = {
  send: [
    check('receiverId').isMongoId().withMessage('Invalid receiver ID'),
    check('content').trim().notEmpty().withMessage('Message content is required')
  ]
};

module.exports = {
  validate,
  userValidationRules,
  taskValidationRules,
  blogValidationRules,
  messageValidationRules
}; 