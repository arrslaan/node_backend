import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String,
            required: true
        },
        coverImage: {
            type: String
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            type: String,
            required: [true, "password is required"]
        },
        refreshToken: {
            type: String
        }
    },
    { timestamps: true }
);

userSchema.pre("save", async function(next) {
  
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password);
}



userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        { 
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET, // Ensure this environment variable is set
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY // Ensure this is in a valid format (e.g., '1h', '7d')
        }
    );
};


userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        { 
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET, // Ensure this environment variable is set
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY // Ensure this is in a valid format (e.g., '1h', '7d')
        }
    );
};



export const User = mongoose.model("User", userSchema);



// const testTokenGeneration = () => {
//     const testUserId = 'some-user-id';
//     const accessToken = jwt.sign(
//         { _id: testUserId },
//         process.env.ACCESS_TOKEN_SECRET,
//         { expiresIn: '1h' }
//     );
//     const refreshToken = jwt.sign(
//         { _id: testUserId },
//         process.env.REFRESH_TOKEN_SECRET,
//         { expiresIn: '10d' }
//     );

//     console.log('Access Token:', accessToken);
//     console.log('Refresh Token:', refreshToken);
// };

// // Run this function to check if tokens are generated correctly
// testTokenGeneration();

// console.log(process.env.ACCESS_TOKEN_SECRET);