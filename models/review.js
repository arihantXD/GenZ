const mongoose = require("mongoose");

const reviewSchema = mongoose.Schema({
    reviewName:{
        type : String,
        required : true
    },
    review:{
        type : String,
        required : true
    } 
})

module.exports = mongoose.model("review", reviewSchema);