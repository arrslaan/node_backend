import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Define storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, './public/tmp');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

// File filter to validate file type
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'video/mp4',
    'video/avi',
    'video/mpeg',
    'video/quicktime'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, PDF, MP4, AVI, MPEG, and QuickTime files are allowed.'));
  }
};

// Set up multer middleware
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB file size limit
});





// import multer from "multer"

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, './public/tmp')
//     },
//     filename: function (req, file, cb) {
  
//       cb(null, file.originalname)
//     }
//   })
  
//  export const upload = multer(
//     {
//          storage,
        
//     }
// )