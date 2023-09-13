const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  featured: {
    type: String
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required : true
  },
  gender: {
    type: String,
    required: true
  },
  sizes: {
    type: [String],
    required : true
  }, 
  xsdescription: {
    type : String,
    required : true
  },
  colors: 
    {
      type: [String],
      required : true
    },
  description: {
    type: [String],
    required: true
  }
});

module.exports = mongoose.model("product", productSchema);