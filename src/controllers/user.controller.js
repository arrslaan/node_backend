import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadFileCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from "jsonwebtoken"
const generateAccessAndRefreshToken = async (userId) => {
  try {
      const user = await User.findById(userId);
      if (!user) {
          throw new Error('User not found');
      }

      const accessToken = user.generateAccessToken(); // No need to await here, jwt.sign is synchronous
      const refreshToken = user.generateRefreshToken(); // Same here
    
      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

      return { accessToken, refreshToken };
  } catch (error) {
      console.error('Error generating tokens:', error); // Log the actual error
      throw new Error('Failed to generate access and refresh token');
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, username, email, password } = req.body;

  console.log("Received user data:", { fullName, username, email, password });

  if ([fullName, username, email, password].some((field) => field?.trim() === '')) {
    throw new ApiError(400, 'All fields are required');
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(400, 'Username or email already exists');
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  console.log("File paths:", { avatarLocalPath, coverImageLocalPath });

  if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar is required');
  }

  let avatar, coverImage;

  try {
    // Upload files to Cloudinary
    avatar = await uploadFileCloudinary(avatarLocalPath);
    coverImage = coverImageLocalPath ? await uploadFileCloudinary(coverImageLocalPath) : null;

    if (!avatar) {
      throw new ApiError(500, 'Failed to upload avatar to Cloudinary');
    }

    console.log("Uploaded files to Cloudinary:", { avatar, coverImage });

    // Create the user
    const user = await User.create({
      fullName,
      username: username.toLowerCase(),
      email,
      password,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
    });

    // Retrieve the user without sensitive fields
    const createdUser = await User.findById(user._id).select('-password -refreshToken');

    if (!createdUser) {
      throw new ApiError(500, 'Failed to create user');
    }

    // Log the user data to debug
    console.log("User data before sending response:", createdUser);

    // Send response
    res.status(201).json(new ApiResponse(200, createdUser, 'User created successfully'));

  } catch (error) {
    console.error("Error during user registration:", error.message);
    throw new ApiError(error.statusCode || 500, error.message || 'Internal Server Error');
  }
});

const loginUser = asyncHandler(async(req,res)=>{
     const{email,username,password} = req.body;
     console.log("Received user login data:",{email,username,password});
     if( !(username || email || password)){
       throw new ApiError(400, 'All fields are required');
     }

     const user = await User.findOne({
      $or:[{username},{email}]
     })

     console.log("loged in user "+user);

     if(!user){
       throw new ApiError(401, 'User does not exist');
     }

   const isPassword = await  user.isPasswordCorrect(password)
     if(!isPassword){
       throw new ApiError(401, 'Incorrect credentials');
     }

 const {accessToken,refreshToken}  = await  generateAccessAndRefreshToken(user._id)

  const logedInUserData = await User.findOne( user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure:true,
  }

  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken)
  .json(new ApiResponse(200,
        {
          logedInUserData,
          accessToken,
          refreshToken
        },

        "User logged in successfully",
    ));
})

const logoutUser = asyncHandler(async(req,res)=>{
     await  User.findByIdAndUpdate(
         req.user._id,
         {
            $set:{   
              refreshToken: undefined,
            },
         },

         {
          new: true,
          
        }
       )

       const options = {
        httpOnly: true,
        secure:true,
      }
    
       return res
      .status(200)
      .clearCookie("accessToken",options)
      .clearCookie("refreshToken",options)
      .json(new ApiResponse(200, {}, "User logged out successfully"));
 
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
  const inComingRefreshToken = req.cookies.refreshToken||req.body.refreshToken;

  if(!inComingRefreshToken){
    throw new ApiError(401, 'No refresh token provided');
  }
try {
  const decodedToken = jwt.verify(inComingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
  
  const user =await User.findOne(decodedToken?._id);
  
  if(!user){
    throw new ApiError(401, 'Invalid refresh token');
  }
  
  if (inComingRefreshToken !==user?.refreshToken) {
      throw new ApiError(401, 'in valid refresh token');
  }
  
  const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
  
   const options ={
    httpOnly: true,
    secure:true,
   }
  
   return res
   .status(200)
   .cookie("accessToken",accessToken, options)
   .cookie("refreshToken",newRefreshToken,options)
   .json(new ApiResponse(
    200,
    {
      accessToken,
      newRefreshToken
    },
    "User token refreshed successfully"
   ))
} catch (error) {
   throw new ApiError(401,"in valid refresh token")
}

})


export {
   registerUser ,
   loginUser,
   logoutUser,
   refreshAccessToken,
  };
