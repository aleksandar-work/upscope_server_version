const express = require('express');
const fs = require('fs');
const router = express.Router();
const mongoose = require('mongoose');
const licenseSchema = require("../models/licenseModel");
const userSchema = require("../models/userModel")
const User = mongoose.model('User', userSchema);
const License = mongoose.model('License', licenseSchema);
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const authVerify = require('../middleware/authVerify');
const { empty, getTolkien, getMySecret, isEmpty } = require('../shared/utils');
const sharp = require('sharp');
var bcrypt = require('bcrypt-nodejs');
const { json } = require('express');
const { v4: uuidv4 } = require('uuid');

async function getUserIdFromToken(token, salt) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, salt, async (err, payload) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(payload.userId);
    })
  })
}


//Signin with password or token
router.post('/biz/auth/tokensignin', async (req, res) => {
  try {
    let { u, authorization } = req.headers;
    const tolkien = getMySecret();
    let isBearer = false;

    //Check the authorization is token or password
    if (authorization.indexOf("Bearer") >= 0) {
      authorization = authorization.split("Bearer ")[1];
      isBearer = true;
    }
    let query = {}
    
    if (isBearer) {
      //If get the token, find the user id from the user table.
      const uId = await getUserIdFromToken(authorization, tolkien);
      query = {
        _id: uId
      }
    } else {
      //If the authorization is password, this means if the user login from the login page, search by email in the user table.
      query = {
        email: u
      }
    }

    const user = await User.findOne(query);
    //console.log(user);
    //In authorization is password case, if the password is invalid, send the error message
    if(!isBearer){
      if(!user.validPassword(authorization)) return res.status(401).json({error: 'Wrong email and password combination.'});
    }
    
    jwt.verify(user.licenseToken, tolkien, async (err, payload) => {
      if (err) {
        return res.send({ error: 'invalid account 3' });
      }
      const license = await License.findById(payload.licenseId);
      if (!license) {
        return res.send({ error: 'invalid account 4' });
      }
      // save Account document into req.user
      user.acc = license;

       // const user = req.user;
      const userToken = jwt.sign({ userId: user._id }, tolkien);

      return res.send({
        userToken,
        _id: user._id,
        name: user.name,
        title: user.title,
        location: user.location,
        domain: user.domain,
        admin: user.admin,
        phone: user.phone,
        email: user.email,
        available: user.available,
        avatar: user.avatar,
        licenseToken: user.licenseToken,
        setupComplete: user.acc.setupComplete,
        dealerInfo: user.acc.dealerInfo,
        address: user.address,
        city: user.city,
        phone: user.phone,
        state: user.state,
        zip: user.zip,
        role: user.role,
        customgreeting: user.customgreeting,
        customgreeting2: user.customgreeting2,
        newUpTime: user.newUpTime,
        busyTime: user.busyTime,
        togglePosterChild: user.togglePosterChild
      });
    });
  } catch (err) {
    return res.send({ error: 'invalid account 6' });
  }
});


//Role == 0: This is admin user. 
//Role == 1: This is Reception User
//Role == 2: This is Sales User

//Activate the license and create the admin user
router.post('/biz/auth/activate', async (req, res) => {
  try {
    const { key, domain, name, email } = req.body;
    // if domain is empty send the error message to front-end
    if (!domain) {
      return res.status(401).json({ error: 'Bad Request. Please check the domain wheather you input or not.' });
    }
    //Find the license with the domain name
    const license = await License.findOne({domain});
    //If there isn't any license, need to send the error message and need to register licence first to register as admin user.
    if (!license) {
      return res.status(401).json({error: 'There is no license. You need to register the license first.'})
    }
    let user;
    const tolkien = getMySecret();
    try {
      //if license is already activated, find the user with the email if not existed send the error message
      if (license.activated === true) {
        user = await User.findOne({ email });
        if (!user) {
          return res.status(401).json({ error: 'License already exists!' });
        }
      } else {
        user = await User.findOne({ email });
        if (user) {
          return res.status(401).json({ error: 'User already existed with this email' });
        }
        //if the license is not activated make the license token and created the user with the info.
        const licenseToken = jwt.sign({ licenseId: license._id }, tolkien);
        user = new User({ name, title: 'Admin', domain, email, location: license.location, licenseToken, key: bcrypt.hashSync(key, bcrypt.genSaltSync(8), null), admin: true, active: true, avatar: '', available: false, role: 0 });
        await user.save();
        license.activated = true;
        await license.save();
      }
      user.acc = license;
    } catch (err) {
      return res.status(500).json({error: "Unexpected Error"});
    }
    try {
      const userToken = jwt.sign({ userId: user._id }, tolkien);
      //Send the user info with success message
      return res.send({
        userToken, // <--- IDK
        _id: user._id,
        name: user.name,
        title: user.title,
        location: user.location,
        domain: user.domain,
        admin: user.admin,
        phone: user.phone,
        email: user.email,
        available: user.available,
        avatar: user.avatar,
        licenseToken: user.licenseToken,
        setupComplete: user.acc.setupComplete,
        dealerInfo: user.acc.dealerInfo
      });
    } catch (err) {
      return res.status(500).json({ error: 'Unexpected Error'});
    }
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
});



// Avatar upload
router.post('/biz/auth/img', authVerify, async (req, res) => {
  try {
    try {
      const img = new Buffer(req.body, 'base64');
      let newB = await sharp(img)
        .resize(200, 200)
        .toBuffer()
        .then(resizedImageBuffer => {
          let resizedImageData = resizedImageBuffer.toString('base64');
          return resizedImageData;
        })
        .catch(error => {
          return 'error';
        })

      await User.findByIdAndUpdate(req.user._id, { avatar: newB });
      return res.send(newB);

    } catch (err) {
      return res.send({ error: 'img upload failed' });
    }

  } catch (err) {
    return res.send({ error: 'invalid account' });
  }
});


router.post('/biz/auth/get-dealers-list', authVerify, async (req, res) => {
  try{
    const {domain} = req.body;
    const dealers = await User.find({domain}).select('-avatar').select('-licenseToken');
    return res.status(200).json({dealers});
  }catch(err) {
    return res.status(500).json({err: 'There is error on the server'});
  }
})


// Manager to create users of the dealer app
router.post('/biz/auth/addUser', authVerify, async (req, res) => {
  try {
    //If the user is not admin cannot add the user. return the error
    if (!req.user.admin) {
      return res.status(400).json({ error: 'No permission to create user' });
    }
    const { name, title, email, phone, role } = req.body;
    //const tolkien = await getTolkien();
    const tolkien = getMySecret();
    const licenseToken = jwt.sign({ licenseId: req.user.acc._id }, tolkien);
    let sameEmailUsers = await User.find({email}).lean();
    if(sameEmailUsers.length > 0){
      return res.status(400).json({error: "There is already user that has the same email"});
    }
    const newUser = new User({ name, title, email, phone, domain: req.user.domain, location: req.user.location, licenseToken, avatar: '', admin: false, active: true, role });

    await newUser.save();

    try {
      const userToken = jwt.sign({ userId: newUser._id }, tolkien);
      return res.status(200).json({ userToken, _id: newUser._id, name: newUser.name, title: newUser.title, email: newUser.email, phone: newUser.phone, avatar: '', active: true });
    } catch (err) {
      return res.status(500).json({ error: 'Unexpected Error' });
    }
  } catch (err) {
    return res.status.json({ error: 'Unexpected Error' });
  }
});

router.put('/biz/auth/updateUser', authVerify, async (req, res) => {
  try {
    if (!req.user.admin) {
      return res.send({ error: 'invalid account' });
    }

    const { _id } = req.body;
    //const tolkien = await getTolkien();
    const tolkien = getMySecret();

    let user = await User.findById(_id);
    if (!user) {
      return res.send({ error: 'invalid' });
    }

    try {
      const userToken = jwt.sign({ userId: user._id }, tolkien);
      user.name = req.body.name;
      user.title = req.body.title;
      user.phone = req.body.phone;
      user.email = req.body.email;
      user.active = req.body.active;
      await user.save();

      return res.send({ userToken, _id: user._id, name: user.name, title: user.title, email: user.email, phone: user.phone, active: user.active });
    } catch (err) {
      return res.send({ error: 'invalid account' });
    }
  } catch (err) {
    return res.send({ error: 'invalid account' });
  }
});

router.get('/biz/auth/getUsers', authVerify, async (req, res) => {
  try {
    if (!req.user.admin) {
      return res.send({ error: 'invalid account' });
    }

    const users = await User.find({ admin: false, domain: req.user.domain, title: {$ne: 'customer'} }).select('-__v -licenseToken -admin -createdAt -updatedAt -domain').lean();
    //const tolkien = await getTolkien();
    const tolkien = getMySecret();

    let userList = users.map((v) => {
      let updatedUser = { ...v };
      const userToken = jwt.sign({ userId: v._id }, tolkien);
      updatedUser.userToken = userToken;

      return updatedUser;
    });

    res.send({ users: userList });
  } catch (err) {
    return res.send({ error: 'invalid account' });
  }
});

router.post('/biz/auth/changeAvatar', authVerify, async(req, res) => {
  try {
    const {avatar, id} = req.body;
    await User.findByIdAndUpdate(id, {avatar});
    return res.status(200).json({message: 'Avatar Updated Successfully'});
  }
  catch(err) {
    return res.status(500).json({error: 'There is some error on the server'});
  }
})

router.post('/biz/auth/changeProfile', authVerify, async(req, res) => {
  try {
    const {id, phone, name, email, customgreeting, customgreeting2, newUpTime, busyTime, togglePosterChild/*, customgreeting3*/} = req.body;
    if(phone && name && email && customgreeting && customgreeting2 && newUpTime && busyTime && togglePosterChild/* && customgreeting3*/) {
      await User.findByIdAndUpdate(id, {phone, name, email, customgreeting , customgreeting2, newUpTime, busyTime, togglePosterChild/*, customgreeting3*/});
      return res.status(200).json({message: 'Updated successfully.'});
    }
    else return res.status(400).json({error: 'Please fill out the form'});
  }
  catch(err) {
    return res.status(500).json({error: 'There is some error on the server'});
  }
});

router.post('/biz/auth/changeVideoGreeting', authVerify, async(req, res) => {
  try {
    const videofile = req.files.videofile;
    var array = videofile.name.split(/\.(?=[^\.]+$)/);
    var extension = array[array.length - 1];
    let fileName = uuidv4();
    let uploadPath = 'public/' + fileName + '.' + extension;
    videofile.mv(uploadPath, async (err) => {
      if(err){
        console.log(err);
        return res.json({"status": "video file not uploaded"});
      }
      else {
        const user = await User.findById(req.body.id);
        if(user.videofilename){
          fs.unlink('public/' + user.videofilename, (err => {
            if(err) console.log(err);
            else console.log("file deleted successfully");
          }));
        }
        user.videofilename = fileName + '.' + extension;
        await user.save();
        return res.json({"status": "video file uploaded successfully"});
      }
    });
  } catch(err){
    return res.status(500).json({error: "There is some error when uploading the video file"});
  }
})

router.post('/biz/auth/addDealerInfo', authVerify, async (req, res) => {
  try {
    if (!req.user.admin) {
      return res.send({ error: 'invalid account' });
    }

    const dealerInfo = req.body;
    // image handling
    try {
      const img = new Buffer(dealerInfo.managerAvatar, 'base64');
      dealerInfo.managerAvatar = img;
      
    } catch (err) {
      // issue with image...
    }

    await License.findByIdAndUpdate(req.user.acc._id, { setupComplete: true, dealerInfo });

    return res.send({ message: 'complete' });

  } catch (err) {
    return res.send({ error: 'invalid account' });
  }
});

router.post('/biz/auth/updateInviteUser', async (req, res) => {
  try {
    const {email, password} = req.body;
    //Validation check on backend
    if(isEmpty(email)) return res.status(400).json({error: 'Email cannot be empty.'});
    if(isEmpty(password)) return res.status(400).json({error: 'Password cannot be empty.'});
    //Find user by Email and change the password to enable them login
    const user = await User.findOne({email});
    if(user){
      if(!isEmpty(user.key)) return res.status(401).json({error: 'You have already account. Please contact with support team.'})
      user.key = user.generateHash(password);

      user.save(function(err){
        if(err) return res.status(500).json({error: 'There is error when update the password.'});
        return res.status(200).json({message: 'Updated successfully'});
      });
    }
  } catch (err) {
    return res.status(500).json({ error: 'There is some error in the server.' });
  }
});

module.exports = router;