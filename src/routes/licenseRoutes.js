const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = mongoose.model('User');
const License = mongoose.model('License');
const Conversation = mongoose.model('Conversation');
const sharp = require('sharp');

//Delete all the conversations list
router.get('/delete-conv', async(req, res) => {
  await Conversation.remove({}, function(){})
})

router.get('/license', async (request, response) => {
  try {
    let result;
    const { shortId, domain } = request.query;
    if(!shortId) return response.status(400).json({error: "ShortId cannot be empty"});
    if (!domain) return response.status(400).json({ error: "domain cannot be empty" });

    let avatar;
    let customerName = '';
    let email = '';
    let role = 0;
    let owner = false;
    const doc = await License.findOne({domain});
    if(!doc) return response.status(400).json({error: 'There is not any license registered'});
    const user = await User.findOne({domain, admin: true}).select('-avatar');
    if(!user) return response.status(400).json({error: 'There is not any admin user of this license.'});
    if(shortId) {
      let saleperson = await User.findOne({domain, admin: true}).select('name avatar email');
      if(saleperson){
        customerName = saleperson.name;
        avatar = saleperson.avatar,
        email = saleperson.email
      }
      let conversation = await Conversation.findOne({shortId}).populate({path: 'owner', select: 'name role avatar email',});
      if(conversation.owner){
        email = conversation.owner.email
        customerName = conversation.owner.name;
        role = conversation.owner.role;
        avatar = conversation.owner.avatar;
        owner = true;
      }
    }
    if(user){
      let flag = false;
      if(user.customgreeting) {
        if(user.customgreeting2){
          result = {...doc._doc, customgreeting: user.customgreeting, customgreeting2: user.customgreeting2, busyTime:user.busyTime, newUpTime:user.newUpTime, role, avatar, owner, phone: user.phone, togglePosterChild: user.togglePosterChild}
        }
        else result = {...doc._doc, customgreeting: user.customgreeting, role, avatar, owner,  phone: user.phone, togglePosterChild: user.togglePosterChild}
        flag = true;
      }
      if(user.videofilename){
        if(flag) result = {...result, videofilename: user.videofilename};
        else {
          result = {...doc._doc, videofilename: user.videofilename};
          flag = true;
        }
      }
      if(customerName){
        if(flag) result = {...result, customerName, role, avatar, owner, email, phone: user.phone, togglePosterChild: user.togglePosterChild};
        else result = {...doc._doc, customerName, role, avatar, owner, email, phone: user.phone, togglePosterChild: user.togglePosterChild};
      }
    }
    return response.send(result);
  } catch (err) {
    return response.send({ error: err });
  }
});

module.exports = router;