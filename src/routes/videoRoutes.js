//Express and server globals
const express = require('express');
const router = express.Router();

//Mongoose Import
const mongoose = require('mongoose');

//Models for User and License So that we can see what users are requesting emails
const userSchema = require("../models/userModel");
const videoLogSchema = require("../models/videoLogModel");

//const License = mongoose.model('License', licenseSchema);
const VideoLog = mongoose.model('VideoLog', videoLogSchema);
const OpenTok = require("opentok");

//Global Variables for Vonage OpenTok
const apiKey = '46741292';
const apiSecret = 'b38bd4d9aa62ef66ac76194500471644dd948dba';
const openTok = new OpenTok(apiKey, apiSecret);
  
router.get('/openTalkSession', async function(req, res){
  //Variables => userType: 'dealer or customer' => shortID => video call id
  try{
    openTok.createSession({mediaMode:"routed"}, function(error, session) {
      if (error) {
        console.log("Error creating session:", error)
      } 
      else {
        let sessionId = session.sessionId;
        // Generate a Token from a session object (returned from createSession)
        token = session.generateToken();
        const videoSessionData = {
          apiKey: apiKey,
          token: token,
          sessionId: sessionId
        }
        let log = new VideoLog({
          shortId: req.query.shortId,
          ...videoSessionData
        });
        log.save().then(data => { 
          let userType = req.query.userType;
          if(userType === "dealer") {
            req.app.get('io').emit(`dealer-video-new`, {...videoSessionData, shortId: req.query.shortId});
          }
          else req.app.get('io').emit(`customer-video-new`, {...videoSessionData, shortId: req.query.shortId});
          res.status(200).json({videoSessionData}); 
        });
      }
    });
  }catch(error){
    console.log(error);
  }
});

module.exports = router;