const mongoose = require("mongoose");
const passportLocalMongoose = require('passport-local-mongoose');
const userSchema = new mongoose.Schema({
  name: {
    type: String,

  },
  username: {
    type: String,
    unique : true,
  },
  lastname: {
    type: String,
  },
  country: {
    type: String,

  },
  city: {
    type: String,

  },
  address: {
    type: String,
  },
  zipcode: {
    type: String,

  },
  phone: {
    type: String,

  },
  password: {
    type: String,
  },
  orders:[{
    type : mongoose.Schema.Types.ObjectId,
    ref:'Order' 
  }]
});
// userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("user", userSchema);