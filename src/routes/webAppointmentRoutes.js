const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Appointment = mongoose.model('Appointment');
const User = mongoose.model('User');

const { empty } = require('../shared/utils');

//function noteTimeStamp() {
//let d = new Date().toISOString();
//return `^TIMESTAMP:${d}`;
//return Date.now();
//}

router.post('/web/apt/new', async (req, res) => {
/*  try {
    let name = req.body.name;
    let email = req.body.email;
    await User.findByIdAndUpdate(req.body.custId, { name, email });
  } catch (err) {
    return res.send('err');
  }
*/
  try {
    let aptData = {
      date: req.body.date,
      time: req.body.time,
      custName: req.body.name,
      custEmail: req.body.email,
      customer: req.body.custId,
      ownerDomain: req.body.domain
    };

    if (!empty(req.body.note)) {
      aptData.notes = [{ note: req.body.note }];
    }

    let apt = new Appointment(aptData);
    await apt.save();
    req.app.get('io').emit('schedule-notif');
    return res.send({ aptId: apt._id });
  } catch (err) {
    //return res.status( 422 ).send( err.message );
    return res.send('err');
  }
});

router.put('/web/apt/change-date', async (req, res) => {
  try {
    let aptId = req.body.aptId;
    let date = req.body.date;
    if (empty(aptId) || empty(date)) {
      return res.send('invalid');
    }

    let apt = await Appointment.findById(aptId);
    if (!apt) {
      return res.send('invalid');
    }
    let oldDate = apt.date;
    let note = `Appointment Change: ${oldDate.toISOString()} TO ${date}`;
    apt.notes.push({ note: note });
    apt.date = date;
    await apt.save();
    return res.send('complete');
  } catch (err) {
    return res.send('err');
  }
});

module.exports = router;