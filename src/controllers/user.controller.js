import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiErrors.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/Cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const generateAccessAndRefreshToken = async (userId)=>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        user.save({validateBeforeSave: false});

    } catch (error) {
        throw new ApiError(500, "Error generating tokens");
    }
}

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

 

    const avatar = await uploadOnCloudinary(avatarLocalPath);
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

const loginUser = asyncHandler(async(req,res)=>{
     // require=> data
     // username or email
     // find the user
     // check the password
     // access and refresh token
     // send cookie
     const {email,userName, password } = req.body;

     if ( !email && !userName) {
         throw new ApiError(400, "Email or userName are required");
     }

     const user = await User.findOne({ 
        $or: [{ email }, { userName }] });
 
     if (!user) {
         throw new ApiError(404, "User not found");
     }

     const isPasswordValid = await user.isPasswordCorrect(password);

     if (!isPasswordValid) {
         throw new ApiError(401, "Invalid email or password");
     }

     const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id);

     const loggedInUser = await User.findById(user.id).select("-password -refreshToken");

     const options ={
        httpOnly:true,
        secure:true
     }

     return res
     .status(200)
     .cookie("accessToken",accessToken,options)
     .cookie("refreshToken",refreshToken,options)
     .json(
        new ApiResponse(
            200,
            {
               user:loggedInUser,accessToken,refreshToken
            },
            "User logged in successfully"
        )
     )
})


const logOutUser =asyncHandler(async(req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,{ 
            $set : {
                refreshToken : undefined
            }

        },
        {
            new: true
        }
    )

    const options ={
        httpOnly:true,
        secure:true
     }

     return res
     .status(200)
     .clearCookie("accessToken", options)
     .clearCookie("refreshToken", options)
     .json(
         new ApiResponse(
             200,
             {},
             "User logged out successfully"
         )
     )

})



export {registerUser, loginUser,logOutUser};



