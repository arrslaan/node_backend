import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadFileCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            throw new Error("No file path provided");
        }

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        console.log("File uploaded to Cloudinary:", response.url);
        return response;
    } catch (error) {
        console.error("Error uploading file to Cloudinary:", error.message);
        return null;
    } finally {
        try {
            if (localFilePath) {
                fs.unlinkSync(localFilePath);
            }
        } catch (cleanupError) {
            console.error("Error cleaning up local file:", cleanupError.message);
        }
    }
};

export { uploadFileCloudinary };
