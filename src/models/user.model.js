import mongoose , {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";


const userSchema = new Schema(
    {
      userName:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true,
      },
      email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
      },
      fullName:{
        type:String,
        required:true,
        trim:true,
        index:true,
      },
      avatar :{
        type:String,
        required:true,
      },
      coverImage:{
        type:String,
      },
      watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref : "video"
        }
      ],
      password:{
        type:String,
        required:[true, "Password is required"],

      },
      refreshToken:{
        type:String,
      },
      
    },
    {
      timestamps:true,
    }
)
userSchema.pre("save", async function(next) {
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
})
userSchema.method.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password,this.password);
}


userSchema.methods.generateAccessToken = function (){
    return jwt.sign(
        _id =this._id,
        email = this.email,
        username = this.userName,
        fullName = this.fullName,
    ),
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiry: process.env.ACCESS_TOKEN_EXPIRY || "1d"
    }
}

userSchema.methods.generateRefreshToken = function (){
    return jwt.sign(
        _id =this._id,
    ),
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiry: process.env.REFRESH_TOKEN_EXPIRY || "1d"
    }
}

export const User = mongoose.model("User", userSchema);
