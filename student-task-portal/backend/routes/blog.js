const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const { auth, adminAuth } = require('../middleware/auth');

// Admin routes
router.post('/', auth, adminAuth, blogController.createPost);
router.get('/admin/all', auth, adminAuth, blogController.getAllPosts);
router.get('/admin/stats', auth, adminAuth, blogController.getPostStats);
router.patch('/:id', auth, adminAuth, blogController.updatePost);
router.delete('/:id', auth, adminAuth, blogController.deletePost);

// Public routes
router.get('/', blogController.getPublishedPosts);
router.get('/:id', blogController.getPostById);
router.post('/:id/comments', auth, blogController.addComment);

module.exports = router; 