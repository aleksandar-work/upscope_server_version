const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { empty } = require('../shared/utils');

/*
*  These are all endpoints for the web clients
*/

router.post('/web/inter/update', async (req, res) => {
  try {
    req.body.user.title = 'customer';
    req.body.user.domain = 'victorydelmont.com';
    req.body.user.admin = false;
    req.body.user.name = req.body.user.name === '' ? 'unknown' : req.body.user.name;
    let user = new User(req.body.user);
    await user.save();

    let conversation = new Conversation({ customer: user._id });

    await conversation.save();
    //conversation = await getConversation( conversation._id );

    req.app.get('io').emit(`customer-message-new`, conversation.messages);

    res.send({ custId: user._id, cid: conversation._id });

  } catch (err) {
    return res.send(err);
    //return res.send( 'error' );
  }
});


module.exports = router;