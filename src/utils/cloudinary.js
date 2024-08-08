import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadFileCloudinary = async (localFilePath) => {
    try {
        // Check if the file path is provided
        if (!localFilePath) {
            throw new Error("No file path provided");
        }

        // Check if the file exists
        await fs.access(localFilePath);

        console.log("Uploading file to Cloudinary:", localFilePath);

        // Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        console.log("File uploaded to Cloudinary:", response.url);
        return response;
    } catch (error) {
        console.error("Error uploading file to Cloudinary:", error.message);
        return null;
    } finally {
        // Clean up the local file
        try {
            await fs.unlink(localFilePath);
            console.log("Local file deleted:", localFilePath);
        } catch (cleanupError) {
            console.error("Error cleaning up local file:", cleanupError.message);
        }
    }
};

export { uploadFileCloudinary };
