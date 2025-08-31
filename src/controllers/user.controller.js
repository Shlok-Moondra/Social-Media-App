import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiErrors.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/Cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

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

const refreshAccessToken = asyncHandler(async(req,res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    
        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized refresh token"); 
        }
    
    
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
    
    
        const user = await User.findById(decodedToken?._id);
    
        if (!user) {
            throw new ApiError(404, "Invalid refresh token");
        }
    
        if (user?.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "expired refresh token");
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken,newRefreshToken} = await generateAccessAndRefreshToken(user._id);
    
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken: newRefreshToken
                },
                "Tokens refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
})


const changeCurrentPassword = asyncHandler(async(req,res) => {
    const {currentPassword , newPassword, confirmPassword} = req.body
    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordValid(currentPassword)

    if (!(newPassword === confirmPassword)) {
        throw new ApiError(400, "New password and confirm password do not match");
    }


    if (!isPasswordCorrect) {
        throw new ApiError(400, "Current password is incorrect");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(
         new ApiResponse(
             200,
             {},
             "Password changed successfully"
         )
    )

})


const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(
        200,
        req.user,
        "current user fetched successfully"
    )
});


const updateAccountDetails = asyncHandler(async(req,res) => {
    const {fullName, email} = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "Please provide all required fields");
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
             $set : {
                fullName,
                email
             }
        },
        {
            new:true
        }
    ).select("-password ")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "User updated successfully"
        )
    )

})

const updateUserAvatar = asyncHandler(async(req,res)=>{
     const avatarLocalPath = req.file?.path

     if (!avatarLocalPath) {
         throw new ApiError(400, "Avtar file is missing");
     }

     const avatar = await uploadOnCloudinary(avatarLocalPath);

     if (!avatar.url) {
         throw new ApiError(400, "Avatar upload failed");
     }

     await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
            
        },
        {
            new:true,
        }
     ).select("-password")

     return res
     .status(200)
     .json(
        new ApiResponse(
            200,
            user,
            "User avatar updated successfully"
        )
     )

})

const updateUserCoverImage = asyncHandler(async(req,res) => {
        const coverImageLocalPath = req.file?.path;

        if (!coverImageLocalPath) {
            throw new ApiError(400, "Cover image file is missing");
        }

       const coverImage = await uploadOnCloudinary(coverImageLocalPath);

       if (!coverImage.url) {
           throw new ApiError(400, "Cover image upload failed");
       }

       await User.findByIdAndUpdate(
           req.user?._id,
           {
               $set: {
                   coverImage: coverImage.url
               }
           },
           {
               new: true,
           }
       ).select("-password");


       return res
     .status(200)
     .json(
        new ApiResponse(
            200,
            user,
            "User coverImage updated successfully"
        )
     )
   })

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {userName} = req.params;

    if (!userName?.trim()) {
        throw new ApiError(400, "User name is required");
    }

     const channel = await User.aggregate([
        {
            $match:{
                userName:userName?.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                subscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{
                            $in:[req.user?._id,"$subscribers.subscriber"],
                            then:true,
                            else:false 
                        }
                    }

                }
            }
        },
        {
            $project:{
                fullName:1,
                userName:1,
                subscribersCount:1,
                channelSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }

        
        
    ])
    if (!channel?.length) {
    throw new ApiError(404, "Channel not found");
}

return res
.status(200)
.json(
    new ApiResponse(
        200,
        channel[0],
        "Channel profile fetched successfully"
    )
)
})

const getWatchHistory = asyncHandler(async(req,res) => {
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from : "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        userName:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0]?.watchHistory || [],
            "Watch history fetched successfully"
        )
    )
})



export {registerUser,
        loginUser,
        getWatchHistory,
        logOutUser,
        getUserChannelProfile,
        refreshAccessToken,
        changeCurrentPassword, 
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImage};



