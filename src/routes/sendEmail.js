//Express and server globals
const express = require("express");
const router = express.Router();

//JWT for the email
const jwt = require('jsonwebtoken');

//SendGrid package depency
const sgMail = require('@sendgrid/mail');
//Set the key
sgMail.setApiKey(process.env.NODE_SGMAIL_KEY);

//Endpoint for sending email from the admin to the other dealser in one domain
router.post("/sendInviteEmail", function(req ,res) {
  try {
    const {email, name} = req.body;
    if(!email) return res.status(400).json({error: "Email cannot be empty."});
    if(!name) return res.status(400).json({error: "Name cannot be empty."});
    var token = jwt.sign({email}, 'secret', {expiresIn: 60});
    const msg = {
      from: "AutoEz <admin@autoez.com>",
      to: email,
      subject: "You are invited to AutoEZ",
      text: "This is out invite message",
      html:
      `
      <h3>Hey ${name} </h3> 
      <div>Access your company's AutoEz account with the following username.</div>
      <div>Email: ${email}</div>
      <div>Please check on the following link to create your password for logging into your AutoEz user account.</div>
      <div><a href='http://localhost:3000/invitelogin?email=${token}'>Click here to register</a></div>
      `,
    }
    sgMail.send(msg).then(() => {
      return res.status(200).json({message: "Invitation sent Successfully"});
    }, error => {
      if(error.response){
        console.error(error.response.body);
        return res.status(500).json({message: "There is some error while sending email."})
      }
    });
  }
  catch {
    return res.status(500).json({message: "There is some error on the server."});
  }
});

module.exports = router;
