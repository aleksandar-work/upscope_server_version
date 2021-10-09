const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authVerify = require('../middleware/authVerify');

const Notification = mongoose.model('Notification');
const Conversation = mongoose.model('Conversation');

// Get Unread Notifications
router.get('/biz/noti/get-notifications', async (req, res) => {

  try {

    const { domain, userId } = req.query;
    
    if (!domain || !userId) {
      return res.status(400).json({ error: "Missing query params" }); 
    }

    // Retrieve all notifications for this user / domain combo
    let queryResult = await Notification.find({ saler: userId, domain: domain, isread: false, conversation: { $exists: true } });
    if (queryResult) {
      return res.status(200).json(queryResult);
    } else {
      return res.status(404).json({ error: "Not found." });
    }

  } catch(err){
    return res.status(500).json({error: err});
  }

});

// Get Notifications & Unanswered status for Conversations
router.get('/biz/noti/notifications-for-convo', async (req, res) => {

  try {

    const { domain, userId, convoIds } = req.query;

    if (!domain || !userId || !convoIds) {
      return res.status(400).json({ error: "Missing query params" }); 
    }

    const conversations = await Conversation.find({ domain });
    const notifications = await Notification.find({ domain, saler: userId, isread: false });

    const convoData = {}; 
    for (let convoId of convoIds) {

      let unanswered = false;
      let notificationCount = 0;

      let matchingConversation = conversations.find(c => { 
        return c._id.toString() === convoId.toString();
      });
      if (matchingConversation) {
        if (matchingConversation.messages && matchingConversation.messages.length > 0 && !matchingConversation.owner) {
          unanswered = true;
        }
      }

      notificationCount = (notifications && notifications.length > 0) ? notifications.filter(n => (n.conversation && n.conversation.toString() === convoId.toString())).length : 0;

      convoData[convoId] = {
        unanswered,
        notificationCount
      };
    }

    return res.status(200).json(convoData);

  } catch(err) {
    console.log(err);
    return res.status(500).json({error: err});
  }

});

// Get Notifications & Unanswered status for Conversations - Single
router.get('/biz/noti/notifications-for-single-convo', async (req, res) => {

  try {

    const { domain, userId, convoId } = req.query;

    if (!domain || !userId || !convoId) {
      return res.status(400).json({ error: "Missing query params" }); 
    }

    const notifications = await Notification.find({ domain, saler: userId, isread: false, conversation: convoId });
    const conversation = await Conversation.findById(convoId);

    let unanswered = false;
    let notificationCount = 0;

    if (conversation && conversation.messages && conversation.messages.length > 0 && !conversation.owner) {
      unanswered = true;
    }

    notificationCount = (notifications && notifications.length) ? notifications.length : 0;

    return res.status(200).json({
      unanswered,
      notificationCount
    });

  } catch(err) {
    console.log(err);
    return res.status(500).json({error: err});
  }
});

// Clear Notification for a Conversation
router.post('/biz/noti/clear-notification', async (req, res) => {
  try {
    const { salerId, convoId } = req.body;
    if (salerId && convoId) {
      let queryResult = await Notification.find({ saler: salerId, conversation: convoId, isread: false });
      for (let matchingNotification of queryResult) {
        let updateResult = await Notification.findOneAndUpdate({ _id: matchingNotification._id }, { isread: true });
      }
      req.app.get('io').emit('customer-message-update', { trigger: 'clear-notification' });
      return res.status(200).json({ status: "Success" });
    } else {
      return res.status(404).json({ error: "Not Found" });
    }
  } catch(err) {
    return res.status(500).json({ error: err });
  }
})

module.exports = router;
