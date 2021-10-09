const mongoose = require('mongoose');

/**
* Schema for storing
**/
const videoLogsSchema = new mongoose.Schema(
  {
    shortId: String,
    apiKey: String,
    token: String,
    sessionId: String,
  },
  {
    //autoIndex: false,
    timestamps: true
  }
);

mongoose.model('VideoLog', videoLogsSchema);

module.exports = videoLogsSchema;
