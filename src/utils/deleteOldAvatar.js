// cloudinaryUtils.js
import cloudinary from 'cloudinary';


// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Deletes a file from Cloudinary given its public ID.
 * @param {string} publicId - The public ID of the file to delete.
 * @returns {Promise<void>}
 */
export const deleteFileCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    throw new Error('Error deleting file from Cloudinary');
  }
};
