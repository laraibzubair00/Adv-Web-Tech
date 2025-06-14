const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  attachments: [{
    filename: String,
    path: String,
    mimetype: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for faster queries
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, read: 1 });

// Static method to get conversation between two users
messageSchema.statics.getConversation = async function(user1Id, user2Id) {
  return this.find({
    $or: [
      { sender: user1Id, recipient: user2Id },
      { sender: user2Id, recipient: user1Id }
    ]
  })
  .sort({ createdAt: 1 })
  .populate('sender', 'name')
  .populate('recipient', 'name');
};

// Static method to get unread message count
messageSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    recipient: userId,
    read: false
  });
};

// Static method to mark messages as read
messageSchema.statics.markAsRead = async function(senderId, recipientId) {
  return this.updateMany(
    {
      sender: senderId,
      recipient: recipientId,
      read: false
    },
    {
      $set: { read: true }
    }
  );
};

// Method to get recent conversations
messageSchema.statics.getRecentConversations = async function(userId) {
  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const conversations = await this.aggregate([
      {
        $match: {
          $or: [
            { sender: userObjectId },
            { recipient: userObjectId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', userObjectId] },
              '$recipient',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$recipient', userObjectId] },
                    { $eq: ['$read', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: 1,
          user: {
            _id: 1,
            name: 1,
            avatar: 1,
            role: 1
          },
          lastMessage: 1,
          unreadCount: 1
        }
      }
    ]);

    // Populate the lastMessage fields
    const populatedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        const populatedMessage = await this.findById(conversation.lastMessage._id)
          .populate('sender', 'name studentId role')
          .populate('recipient', 'name studentId role');
        return {
          ...conversation,
          lastMessage: populatedMessage
        };
      })
    );

    return populatedConversations;
  } catch (error) {
    console.error('Error in getRecentConversations:', error);
    throw error;
  }
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 