import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadFileCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from "jsonwebtoken"
import mongoose from 'mongoose';
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

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, 'No refresh token provided.');
  }

  try {
    // Verify the refresh token
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
    // Find the user by ID from the decoded token
    const user = await User.findOne({ _id: decodedToken._id });
    
    if (!user) {
      throw new ApiError(401, 'User associated with the refresh token not found.');
    }

    // Validate the refresh token
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, 'Invalid refresh token.');
    }
    
    // Generate new access and refresh tokens
    const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id);
    
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' // Ensure secure flag is set in production
    };
    
    return res
      .status(200)
      .cookie('accessToken', accessToken, options)
      .cookie('refreshToken', newRefreshToken, options)
      .json(new ApiResponse(
        200,
        {
          accessToken,
          newRefreshToken
        },
        'User token refreshed successfully.'
      ));
  } catch (error) {
    // Handle token verification or any other errors
    throw new ApiError(401, 'Failed to refresh tokens. Please try again.');
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  console.log("Received user password change data:", { oldPassword, newPassword });

  // Find the user by their ID
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Check if the old password is correct
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword); // Assuming this is an instance method
  if (!isPasswordCorrect) {
    throw new ApiError(401, 'Incorrect old password');
  }

  // Update the user's password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  // Respond with success
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async(req,res)=>{
  return res
   .status(200)
   .json(new ApiResponse(200, req.user, "currentUser data retrieved successfully"));
})

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  console.log("Received user account update data:", { fullName, email });

  if (!email || !fullName) {
    throw new ApiError(400, 'Full name and email are required');
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id, 
    { fullName, email }, 
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User account details updated successfully"));
});


const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  console.log("Received user avatar update data:", { avatarLocalPath });

  if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar is required');
  }

  const avatar = await uploadFileCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(500, 'URL not found while updating avatar image');
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      }
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User avatar updated successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  console.log("Received user coverImage update data:", { coverImageLocalPath });

  if (!coverImageLocalPath) {
    throw new ApiError(400, 'Cover image is required while updating.');
  }

  const coverImage = await uploadFileCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(500, 'URL not found while updating cover image.');
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      }
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
      throw new ApiError(400, "User is missing in params");
  }

  const channel = await User.aggregate([
      {
          $match: {
              username: username.toLowerCase(),
          },
      },
      {
          $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
          },
      },
      {
          $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "subscriber",
              as: "subscribedTo",
          },
      },
      {
          $addFields: {
              subscribersCount: { $size: "$subscribers" },
              channelsSubscribedCount: { $size: "$subscribedTo" },
              isSubscribed: {
                  $cond: {
                      if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                      then: true,
                      else: false,
                  },
              },
          },
      },
      {
          $project: {
              fullName: 1,
              username: 1,  // Fixed typo here
              subscribersCount: 1,
              channelsSubscribedCount: 1,
              isSubscribed: 1,
              avatar: 1,
              coverImage: 1,
              email: 1,
          },
      },
  ]);

 

  if (!channel?.length) {
      throw new ApiError(404, 'User not found');
  }

 

  return res
      .status(200)
      .json(new ApiResponse(200, channel[0], "User channel profile retrieved successfully"));
});

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
       {
         $match:{
            _id: new mongoose.Types.ObjectId(req.user._id)
         },
         
       },

       {
         $lookup:{
            from: "videos",
            localField: "watchHistory",
            foreignField: "_id",
            as: "watchHistory",
            pipeline:[
              {
                $lookup:{
                  from: "users",
                  localField: "owner",
                  foreignField: "_id",
                  as: "owner",
                  pipeline:[
                    {
                      $project:{
                        fullName: 1,
                        avatar: 1,
                        username: 1,
                      
                      }
                    }
                  ]
                }
              },
              {
                $addFields:{
                  owner:{
                    $first :"$owner"
                  }
                }
              }
            ]
         }
       }
    ])

    return res.status(200)
    .json(new ApiResponse(200, user[0].watchHistory, "User watch history retrieved successfully"));
})
export {
   registerUser ,
   loginUser,
   logoutUser,
   refreshAccessToken,
   changeCurrentPassword,
   getCurrentUser,
   updateAccountDetails,
   updateUserAvatar,
   updateCoverImage,
   getUserChannelProfile,
   getWatchHistory
  };
