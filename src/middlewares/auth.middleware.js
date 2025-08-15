import { asyncHandler } from "../utils/asyncHandler";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.headers("Authorization")?.replace("Bearer","")

    if (!token) {
        return next(new ApiError(401, "Unauthorized"));
    } 

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

    const user = await User.findById(decodedToken?.id).select(
        "-password -refreshToken"
    )

    if (!user) {
        return new ApiError(401, "Invalid Access Token");
    } 

    req.user =user;
    next()

        
    } catch (error) {
        throw new ApiError(401, "Unauthorized", error.message);
    }



});