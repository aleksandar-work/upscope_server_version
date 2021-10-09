const express = require( 'express' );
const router = express.Router();
const mongoose = require( 'mongoose' );
const ipstack = require('ipstack')

const Message = mongoose.model( 'Message' );

const userSchema = require("../models/userModel");

const User = mongoose.model('User', userSchema);

const Conversation = mongoose.model('Conversation');
const Notification = mongoose.model('Notification');

const licenseSchema = require("../models/licenseModel");
const License = mongoose.model('License', licenseSchema);

const authVerify = require( '../middleware/authVerify' );
const { empty } = require( '../shared/utils' );

// TODO: only allow access to this from the dealership
// - need a registry database for all of our customers and their key & registration/license info
// IP white list or some other isolation technique
// - create a middleware call for everything here

const postClaimHook = async (convId) => {

  // var criteria = {
  //   _id:{ $in: request.payload.split(‘,’)}
  //  };
  //  Models.users.User.update(criteria, { status: true }, { multi: true }, function(err, res) {

  try {

    // Dismiss all notifications for the conversation
    const notifs = await Notification.find({ conversation: convId });

    if (notifs && notifs.length && notifs.length > 0) {
      const notif_ids = notifs.map(n => n._id);
      const criteria = {
        _id: { $in: notif_ids }
      };

      await Notification.update(criteria, { isread: true }, { multi: true });
    }
  } catch(err) {
    console.error(err);
  }
};

/*
*  These are all endpoints for the dealer clients
*/
router.put('/biz/conv/add-msg', authVerify, async ( req, res ) => {
  try {
    let convId = req.body.convId;
    if (empty(convId)) {
      return res.send('invalid');
    }
    let conversation = await Conversation.findById(convId);
    if (!conversation) {
      return res.status.json({message: 'There is conversation.'});
    }
    let msg = new Message( req.body );
    // check for conv owner; if none, set conv owner to msg sender ObjectId
    if (!conversation.owner) {
      conversation.owner = msg.sender;
      conversation.claimedAt = Date.now();
      await postClaimHook(convId);
      req.app.get('io').emit(`dealer-claimed-${conversation.shortId}`);
      req.app.get('io').emit('customer-message-update', { type: 'claim' });
    }
    conversation.messages.push(msg);
    await conversation.save();
    let shortId = conversation.shortId;
    conversation = await getConversation(convId);
    //req.app.io.emit( `dealer-message-${convId}`, { conversation } );
    console.log(`socket event occured dealer-message-${shortId}`);
    req.app.get('io').emit(`dealer-message-${shortId}`, conversation.messages);
    //If the conversation dones't have any owner, that should be claimed.
    return res.status(200).json({conversation});
  } catch (err) {
    console.error(err);
    return res.send({error: 'invalid'});
  }
});


/**
 * Get Distance from Dealer Address, from IP Address 
 */
 router.get('/biz/conv/distance-from-dealer', authVerify, async (req, res) => {

  try {

      const domain = req.query.domain;
      const ip = req.query.ip;

      if (!domain || !ip) return res.status.json({ error: "Domain or IP has not been specified" });

      const license = await License.findOne({domain});
      if (license) {

        const { address, city, state, zip } = license.dealerInfo;

        ipstack(ip, process.env.IPSTACK_KEY, (err, response) => {
          
          if (err) {
            console.error(err);
            return res.status(500).json({ error: err });
          }

          let { latitude, longitude } = response;

          return res.status(200).json({ dist: "OK" });

        });
      }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err });
  }
});

// get a full conversation by ID
router.post('/biz/conv/view', async ( req, res ) => {
  try {
    console.log("request arrived");
    let convId = req.body.convId;
    if(!convId) return res.status(400).json({error: "There should be conID"});
    if ( empty( convId ) ) {
      return res.send( 'invalid' );
    }

    let conversation = await getConversation(convId);
    //console.log(conversation);
    if (!conversation ) {
      return res.send('invalid');
    }
    //console.log(convId);
    res.send( { conversation } );

  } catch ( err ) {
    return res.send( { error: 'invalid' } );
  }
} );

// get all conversations
router.post( '/biz/conv/all', authVerify ,async ( req, res ) => {
  try {
    let {domain, admin, id} = req.body;
    let conversations = await getAllConversations(domain, admin, id);
    res.send({conversations});
  } catch ( err ) {
    return res.send( { error: 'invalid' } );
  }
});

router.post( '/biz/conv/claim', authVerify, async (req, res) => {
  try {
    const {shortId, userId} = req.body;
    let temp = await Conversation.findOne({shortId});
    if(temp){
      if(temp.owner) return res.status(400).json({message: "Conversation already existed"});
      else {
        temp.owner = userId;
        await temp.save();
      }
    }
    else {
      let conversation = new Conversation();
      conversation.owner = userId;
      conversation.shortId = shortId;
      await conversation.save();
    }

    await postClaimHook(conversation._id);

    req.app.get('io').emit(`dealer-claimed-${shortId}`);
    req.app.get('io').emit('customer-message-update', { type: 'claim' });
    return res.status(200).json({message: 'Claimed successfully.'});
  }catch(err){
    return res.status(500).json({error:err});
  }
});

//Endpoint for assing to use(Admin and Reception)
router.post('/biz/conv/assign-conv', authVerify, async(req, res) => {
  try{
    let {shortId, userId} = req.body;
    //console.log(shortId);
    let conv = await Conversation.findOne({shortId});
    //Reassign case
    if(conv){
      conv.owner = userId;
      await conv.save();
    }
    //Assign case
    else {
      let conversation = new Conversation(); 
      conversation.owner = userId;
      conversation.shortId = shortId;
      await conversation.save();
    }

    await postClaimHook(conversation._id);

    req.app.get('io').emit(`dealer-assign-${shortId}`);
    req.app.get('io').emit('customer-message-update', { type: 'claim' });
    return res.status(200).json({message: 'Assigned successfully'});
  } catch(err){
    return res.status(500).json({error: "There is some error on the server"});
  }
})

//Get the salers list for the reassign
router.post('/biz/conv/get-reassign-list', authVerify, async(req, res) => {
  try {
    let {shortId, domain} = req.body;
    if(!shortId) return res.status(400).json({error: 'Conversation cannot be empty.'});
    if(!domain) return res.status(400).json({error: 'Domain cannot be empty.'});
    let conversation = await Conversation.findOne({shortId});
    if(conversation){
      const dealers = await User.find({domain, role: 2}).select('-avatar').select('-licenseToken');
      const result = dealers.filter(dealer => {
        if(!dealer._id.equals(conversation.owner)){
          return true;
        }
        else return false;
      }
      );
      return res.status(200).json({result});
    }
    else {
      const dealers = await User.find({domain, role: 2}).select('-avatar').select('-licenseToken');
      return res.status(200).json({result: dealers});
    }
    
  } catch(err){
    return res.status(500).json({error: "There is some error on the server"});
  }
})

router.get('/biz/conv/dealer-types', async (req, res)=> {
  try {
    const payload = [{
      shortId: req.body.shortId,
      typeStatus: req.body.typeStatus
    }];
    let shortId = req.body.shortId;
    //console.log(shortId);
    req.app.get('io').emit(`dealer-types-${shortId}`, payload);
    //console.log('all good here');
    return res.send(payload);
  } catch (err) {
    return res.send('error');
  }
});

router.put('/biz/conv/prog-msg', async (req, res) => {
  try {
    let shortId = req.body.shortId;
    if (empty(shortId)) {
      return res.send('invalid');
    }
    let progMessage = req.body.prog;
    req.app.get('io').emit(`dealer-prog-message-${shortId}`, progMessage);
    return res.send('prog');
  } catch (err) {
    return res.send('error');
  }
});

//YOU ARE HERE////////////////////////////////////////

router.post('/biz/conv/request-salesperson', async ( req, res ) => {
  try {
    const {shortID} = req.query;

    if(empty(shortID)) return res.status(400).json({error: 'ShortID cannot be empty.'});

    req.app.get('io').emit(`remove-customer-request`, shortID);
    
    let conversation = await Conversation.findOne({shortId:shortID});

    if(conversation){
      
      conversation.requested = false;
      await conversation.save();
      res.send({message: `Saved true to this ID: ${shortID}`});
    }

    // return res.status(200).json({message: `SENT A RESPONSE. ${shortID}`});
  }catch(err){
    return res.status(500).json({error:err});
  }
});

router.post('/biz/conv/save-customer-info', async(req, res) => {
  try{
    let { shortId, type } = req.body;
    if(!shortId) return res.status(400).json({error: 'ShortId cannot be empty.'});
    if(!type) return res.status(400).json({error: 'Type cannot be empty.'});
    let conversation = await Conversation.findOne({shortId});
    if(type === 'name'){
      let { name } = req.body;
      conversation.name = name;
      await conversation.save();
      return res.send({message: 'Saved Successfully'});
    }
    else if(type === 'phone'){
      let { phone } = req.body;
      conversation.phone = phone;
      await conversation.save();
      return res.send({message: 'Saved Successfully'});
    }
    else if(type === 'email'){
      let { email } = req.body;
      conversation.email = email;
      await conversation.save();
      return res.send({message: "Saved Successfully"});
    }
    else return res.status(400).json({error: "Type is invalid"});
  } catch(err) {
    res.status(500).json({error: err});
  }
})

// Get single conversation and populate message sender info
async function getConversation(convId) {
  let conversation = await Conversation.findById(convId).populate(
    {
      path: 'messages.sender',
      select: 'name title'
    }
  );
  return conversation;
}

// Get all conversations
async function getAllConversations(domain, admin, id) {
  if(domain && id){

    let conversations = await Conversation.find({ domain: domain }).populate(
      {
        path: 'customer',
        select: 'name'
        //select: 'name title -_id'
      }
    ).populate(
      {
        path: 'owner',
        select: 'name title'
        //select: 'name title -_id'
      }
    ).populate(
      {
        path: 'messages.sender',
        select: 'name title'
        //select: 'name title -_id'
      }
    );

    if(admin){ //If user is admin, return all the conversations to the user
      return conversations;
    }
    //If the user is not admin, should be sales person
    else {
      const result = conversations.filter(item => {
        if(item.owner === undefined || item.owner === null){
          return true;
        }
        else if(item.owner._id == id) return true;
        else return false;
      });
      return result;
    }
  }
  else return [];
}

module.exports = router;