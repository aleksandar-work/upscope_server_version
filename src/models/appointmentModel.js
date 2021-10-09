const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    note: String,
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: { type: Date, default: Date.now }
  }
);

/*
  date: the scheduled date of the appointment
  notes: anything around this appointment; if an appointment was changed or cancelled or whatever, a note can be added to mention this; 
    no notes will be deleted, just new notes added
*/
const appointmentSchema = new mongoose.Schema(
  {
    date: Date,
    time: String,
    custName: String,
    custEmail: String,
    ownerDomain: String,
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: [noteSchema]
  },
  {
    //autoIndex: false,
    timestamps: true
  }
);

mongoose.model('Appointment', appointmentSchema);

module.exports = appointmentSchema;