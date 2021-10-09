const mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
      //enum: ['customer', 'manager', 'salesman']
    },
    admin: {
      type: Boolean,
      required: true
    },
    phone: String,
    other: String,
    email: {
      type: String,
      unique: true
    },
    domain: {
      type: String,
      required: true
    },
    key: String,
    location: String,
    licenseToken: String,
    avatar: String,
    active: Boolean,
    available: Boolean,
    address: String,
    city: String,
    state: String,
    zip: String,
    role: Number,
    customgreeting: String,
    customgreeting2: String,
    videofilename: String,
    newUpTime: Number,
    busyTime: Number,
    togglePosterChild: Number
  },
  {
    //autoIndex: false,
    timestamps: true
  }
);

userSchema.methods.generateHash = function(key) {
  return bcrypt.hashSync(key, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function(key) {
  return bcrypt.compareSync(key, this.key);
};

mongoose.model('User', userSchema);

module.exports = userSchema;