import jwt from "jsonwebtoken"
const testTokenGeneration = () => {
    const testUserId = 'some-user-id';
    const accessToken = jwt.sign(
        { _id: testUserId },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '1h' }
    );
    const refreshToken = jwt.sign(
        { _id: testUserId },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '10d' }
    );

    console.log('Access Token:', accessToken);
    console.log('Refresh Token:', refreshToken);
};

// Run this function to check if tokens are generated correctly
testTokenGeneration();

console.log(process.env.ACCESS_TOKEN_SECRET);