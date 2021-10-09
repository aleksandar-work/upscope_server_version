const mongoose = require( 'mongoose' );

/*
  sender
  message: the message being sent
  createdAt: time the message was sent
*/
const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    createdAt: { type: Date, default: Date.now }
  },
  {
    //autoIndex: false
    timestamps: true
  }
);

/*
  messages: list of all messsages in this conversation
  owner: dealership user ID that owns this conversation; if null/undefined, then the dealer/salesman hasn't responded yet
*/
const conversationSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    domain: String,
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    claimedAt: {
      type: Date
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sales: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    messages: [messageSchema],
    shortId: {
      type: String, //This is the shortId to corresponds to upscope
      unique: true
    },
    requested:{
      type: Boolean
    },
    urls: [Object]
  },
  {
    //autoIndex: false,
    timestamps: true
  }
);

mongoose.model( 'Message', messageSchema );
mongoose.model( 'Conversation', conversationSchema );

module.exports = messageSchema, conversationSchema;