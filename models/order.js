const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user : {
        type : mongoose.Schema.Types.ObjectId , ref: "User"
    },
    email : String,
    name : String,
    products : [{
        pId : String,
        name : String,
        size: String,
        img : String,
        price : Number,
        qty : Number
    }],
    totalAmount : Number,
    totalProducts : Number,
    orderDate : Date,
    status : String,
    shippingAddress : String,
    paymentMethod : String,
    paymentStatus : String,
    shippingMethod : String,
    phone : Number
});

module.exports = mongoose.model("order", orderSchema);