// require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import connectDB from "./src/db/index.js";
dotenv.config({
    path:"./.env"
})

connectDB()