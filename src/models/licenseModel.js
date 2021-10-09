const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    activated: {
      type: Boolean,
      required: true
    },
    setupComplete: {
      type: Boolean,
      required: true
    },
    dealerInfo: Object
  },
  {
    //autoIndex: false,
    timestamps: true
  }
);

mongoose.model('License', licenseSchema);

module.exports = licenseSchema; 
