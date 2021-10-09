const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const appointmentSchema = require('../models/appointmentModel');
const Appointment = mongoose.model('Appointment', appointmentSchema);
const moment = require('moment');
const authVerify = require('../middleware/authVerify');
const { empty } = require('../shared/utils');

router.put('/biz/apt/take-ownership', authVerify, async (req, res) => {
  try {
    let aptId = req.body.aptId;
    let sender = req.body.sender;

    if (empty(aptId) || empty(sender)) {
      return res.send('invalid');
    }

    let apt = await Appointment.findById(aptId);
    if (!apt) {
      return res.send('invalid');
    }

    apt.owner = sender;

    apt.notes.push({ note: `Owner: ${sender}` });
    await apt.save();


    let appointments = await Appointment.find().populate(
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
    );

    let data = aptFormat(appointments);
    res.send(data);

    //let data = aptFormat( [apt] );
    //return res.send( data );

  } catch (err) {
    return res.send({ error: 'invalid' });
  }
});

router.put('/biz/apt/add-note', authVerify, async (req, res) => {
  try {
    let aptId = req.body.aptId;
    let note = req.body.note;
    if (empty(aptId) || empty(note)) {
      return res.send('invalid');
    }

    let apt = await Appointment.findById(aptId);
    if (!apt) {
      return res.send('invalid');
    }
    apt.notes.push({ note: note });
    await apt.save();

    return res.send({ appointment: apt });
  } catch (err) {
    return res.send({ error: 'invalid' });
  }
});

router.put('/biz/apt/change-date', authVerify, async (req, res) => {
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

    return res.send({ appointment: apt });
  } catch (err) {
    return res.send({ error: 'invalid' });
  }
});

// get all appointments
router.get('/biz/apt/all', async (req, res) => {
  try {
    // TODO: find only appointments
    let firstThingToday = new Date();
    firstThingToday.setHours(0, 0, 0, 0);
    let appointments = await Appointment.find({ownerDomain:req.query.domain, date: { $gt: firstThingToday } }).sort({ date: 1 }).populate(
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
    );
    let data = aptFormat(appointments);
    res.send(data);
  } catch (err) {
    return res.send({ error: 'invalid' });
  }
});

function aptFormat(appointments){
  let data = {};
  for (let p of appointments) {
    //let shortDate = moment( p.date ).format( 'YYYY-MM-DD' );
    let shortDate = moment(p.date).format('dddd,  MMM Do');
    if (!data[shortDate]) {
      data[shortDate] = [];
    }
    data[shortDate].push({
      aptId: p._id,
      customer: {
        name:p.custName,
        email: p.custEmail
      },
      owner: p.owner,
      date: p.date,
      time: p.time,
      notes: p.notes
    });
  }

  return data;
}

module.exports = router;