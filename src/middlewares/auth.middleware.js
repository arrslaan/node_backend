import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import {ApiError} from "../utils/ApiError.js"; // Make sure ApiError is properly imported

export const verifyJwt = asyncHandler(async (req, res, next) => {
  const token = req.cookies.accessToken || req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded?._id).select("-password -refreshToken");

    if (!user) {
      throw new ApiError(404, "User not found file auth.middleware.js");
    }

    req.user = user;
    next();
  } catch (error) {
    next(new ApiError(401, "Unauthorized request"));
  }
});
