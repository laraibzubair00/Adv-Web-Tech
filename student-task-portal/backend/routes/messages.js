const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');

// All routes require authentication
router.use(auth);

// Get messages for current user
router.get('/', async (req, res) => {
  try {
    console.log('Fetching messages for user:', req.user._id);
    const messages = await Message.find({
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id }
      ]
    })
    .populate({
      path: 'sender',
      select: 'name studentId role',
      model: 'User'
    })
    .populate({
      path: 'recipient',
      select: 'name studentId role',
      model: 'User'
    })
    .sort({ createdAt: -1 });
    
    console.log('Messages found:', messages.length);
    // Log the first message to check populated fields
    if (messages.length > 0) {
      console.log('Sample message:', {
        sender: messages[0].sender,
        recipient: messages[0].recipient,
        content: messages[0].content
      });
    }
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Send a message
router.post('/', async (req, res) => {
  try {
    const { content, recipient } = req.body;
    console.log('Sending message:', { content, recipient, sender: req.user._id });

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    let recipientId;
    if (recipient === 'admin') {
      // Find an admin user
      const admin = await User.findOne({ role: 'admin' });
      if (!admin) {
        return res.status(404).json({ message: 'No admin found' });
      }
      recipientId = admin._id;
    } else {
      recipientId = recipient;
    }

    // Create message with current user as sender
    const message = new Message({
      content,
      sender: req.user._id,
      recipient: recipientId
    });

    await message.save();
    console.log('Message saved:', message);

    // Populate sender and recipient details
    await message.populate({
      path: 'sender',
      select: 'name studentId role',
      model: 'User'
    });
    await message.populate({
      path: 'recipient',
      select: 'name studentId role',
      model: 'User'
    });

    console.log('Populated message:', {
      sender: message.sender,
      recipient: message.recipient,
      content: message.content
    });

    // Emit socket event for real-time updates
    if (global.io) {
      global.io.to(recipientId.toString()).emit('newMessage', message);
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

// Get unread message count
router.get('/unread', async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user._id,
      read: false
    });
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Error getting unread count' });
  }
});

// Mark messages as read
router.post('/read', async (req, res) => {
  try {
    await Message.updateMany(
      {
        recipient: req.user._id,
        read: false
      },
      {
        read: true
      }
    );
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Error marking messages as read' });
  }
});

// Get conversation with a specific user
router.get('/conversations/:userId', async (req, res) => {
  try {
    const messages = await Message.getConversation(req.user._id, req.params.userId);
    res.json(messages);
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ message: 'Error getting conversation' });
  }
});

// Get recent conversations
router.get('/conversations', async (req, res) => {
  try {
    console.log('Fetching recent conversations for user:', req.user._id);
    const conversations = await Message.getRecentConversations(req.user._id);
    console.log('Found conversations:', conversations.length);
    res.json(conversations);
  } catch (error) {
    console.error('Error getting recent conversations:', error);
    res.status(500).json({ 
      message: 'Error getting recent conversations',
      error: error.message 
    });
  }
});

module.exports = router; 