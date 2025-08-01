import mongoose from "mongoose";
import DB_NAME from "./constants"
import { application } from "express";

 
(async () => {
    try{
     await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
     app.on("error",(error)=>{
        console.log("Error connecting to MongoDB");
        throw error;
     })
     app.listen(process.env.PORT, () => {
        console.log(`Server is running on port ${process.env.PORT}`)
     })
    }catch(err){
        console.error("Error connecting to MongoDB:", err);
        throw err;
    }
} )()