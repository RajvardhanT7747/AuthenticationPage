const mongoose = require("mongoose");
const connect = mongoose.connect("mongodb://localhost:27017/MyDataBase");

connect.then(()=>{
    console.log("DataBase connected successfully");
})
.catch(()=>{
  console.log("database cant be connected");
}); 

const LoginSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    resetToken: {
        type: String,
        default: null, // Default value to ensure it exists
    },
    resetTokenExpiry: {
        type: Date,
        default: null, // Default value to ensure it exists
    },
});



// model
const collection = new mongoose.model("MyDataBase", LoginSchema);
module.exports = collection;