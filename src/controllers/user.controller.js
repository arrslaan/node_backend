import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadFileCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, username, email, password } = req.body;

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

  if (!avatarLocalPath) { // fixed condition to check coverImageLocalPath
    throw new ApiError(400, 'Cover image is required');
  }

  const avatar = await uploadFileCloudinary(avatarLocalPath);
  const coverImage = await uploadFileCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(500, 'Failed to upload avatar to cloudinary');
  }

  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || '',
  });

  const createdUser = await User.findById(user._id).select('-password -refreshToken');

  if (!createdUser) {
    throw new ApiError(500, 'Failed to create user');
  }

  res.status(201).json(new ApiResponse(200, createdUser, 'User created successfully'));
});

export { registerUser };
