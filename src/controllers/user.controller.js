import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiErrors.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/Cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async(req , res)=>{
    //get user data from the frontend
    // validation
    //check if the user already exists
    //check for image and avatar
    //upload them to cloudinary
    //create user in the database

    const { fullName,email, userName, password}=req.body
    // console.log("email: ",email)

    if (
        [fullName,email,userName,password].some((fields)=>
        fields?.trim() === "")
    ) {
        throw new ApiError(400,"All feilds are required")
    }

    const existedUser= await User.findOne({
        $or: [{email},{userName}]
    })

    if (existedUser) {
        throw new ApiError(400, "User already exists with this email or username");
    }


    const avatarLocalPath = req.files?.avatar[0].path;
     let coverImagePath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImagePath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }

 

    const avatar =await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImagePath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        userName : userName.toLowerCase(),
    })

    const createedUser = await User.findById(user.id).select(
        "-password -refreshToken"
    )

    if (!createedUser) {
        throw new ApiError(500, "something went wrong  while registering the user");
    }


    return res.status(201).json(
        new ApiResponse(200,createedUser,"User registered successfully")
    )
})



export {registerUser};



