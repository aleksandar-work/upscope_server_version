const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const userSchema = require("../models/userModel");
const licenseSchema = require("../models/licenseModel");
const User = mongoose.model('User', userSchema);
const License = mongoose.model('License', licenseSchema);
const { getTolkien, getMySecret } = require('../shared/utils');


/*
This is used to authenticate a user by their user token against the account tolkien
  -AND- to verify the user license token matches a license
If their tolkien is verified, they can proceed with their request
*/
const authVerify = async (req, res, next) => {
  // let tolkien = await getTolkien();
  let tolkien = getMySecret();
  const { authorization } = req.headers;
  const { u } = req.headers;

  // TODO -MAYBE- : require a device ID that is set in the user token so that another device cannot use the same user token

  if (!authorization || !u) {
    return res.send({ error: 'invalid account 1' });
  }else {

  }

  const userToken = authorization.replace('Bearer ', '');
  jwt.verify(userToken, tolkien, async (err, payload) => {

    if (err) {
      return res.send({ error: 'invalid account 2' });
    }

    // save User document into req.user
    req.user = await User.findById(payload.userId).lean();

    if (req.user) {
      // check if userName that was sent with headers matches the user found using the userToken
      if (req.user.name !== u) {
        return res.send({ error: 'invalid account 0' });
      }
      // if user active is false, the user is not allowed to log in
      if (!req.user.active) {
        return res.send({ error: 'account deactivated' });
      }

      jwt.verify(req.user.licenseToken, tolkien, async (err, payload) => {
        if (err) {
          return res.send({ error: 'invalid account 3' });
        }

        const license = await License.findById(payload.licenseId).select('-key');

        if (!license) {
          console.log('AUTH: no license found: ' + req.user.toString());
          return res.send({ error: 'invalid account 4' });
        }
        // save Account document into req.user
        req.user.acc = license;
        return next();

      });
    } else {
      console.log('AUTH: no user found with jwt payload.userId: ' + payload.userId);
      return res.send({});
    }

  });
};

module.exports = authVerify;