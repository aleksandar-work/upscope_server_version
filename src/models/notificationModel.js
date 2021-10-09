const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({

    /** Licensed Dashboard User that this Notification is created for */
    saler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    /** License Domain that this End-User belongs to */
    domain: {
      type: String,
      required: true
    },

    /** Conversation that this Notification is relevant to */
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true
    },

    /** End-User Client UID */
    shortId: {
      type: String,
      required: true
    },

    /** Notification Type */
    type: {
      type: String,
      enum: ["new"]
    },

    /** Read Tracking on Notification */
    isread: Boolean,

    createdAt: { type: Date, default: Date.now }
  
});

mongoose.model('Notification', notificationSchema);

module.exports = notificationSchema;