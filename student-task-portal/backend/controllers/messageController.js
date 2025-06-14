const Message = require('../models/Message');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');

// Send message
const sendMessage = async (req, res) => {
  try {
    const { receiverId, content, attachments } = req.body;

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    const message = new Message({
      sender: req.user._id,
      receiver: receiverId,
      content,
      attachments
    });

    await message.save();

    // Send email notification if receiver is not online
    if (!receiver.isOnline) {
      await sendEmail({
        to: receiver.email,
        subject: 'New Message Received',
        text: `You have received a new message from ${req.user.name}`
      });
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ message: 'Error sending message' });
  }
};

// Get conversation
const getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.getConversation(req.user._id, userId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching conversation' });
  }
};

// Get recent conversations
const getRecentConversations = async (req, res) => {
  try {
    const conversations = await Message.getRecentConversations(req.user._id);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching conversations' });
  }
};

// Mark messages as read
const markAsRead = async (req, res) => {
  try {
    const { senderId } = req.params;
    await Message.markAsRead(senderId, req.user._id);
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking messages as read' });
  }
};

// Get unread count
const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.getUnreadCount(req.user._id);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching unread count' });
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only sender can delete message
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await message.remove();
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting message' });
  }
};

module.exports = {
  sendMessage,
  getConversation,
  getRecentConversations,
  markAsRead,
  getUnreadCount,
  deleteMessage
}; 