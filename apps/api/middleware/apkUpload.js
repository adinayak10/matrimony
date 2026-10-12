const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Define the upload directory for APK files
const uploadDir = "uploads/apk";

// Check if the directory exists, create it if not
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("APK upload directory created:", uploadDir);
}

// Configure Multer Storage for APK files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const versionName = req.body.versionName ? req.body.versionName.replace(/\./g, '_') : 'app';
    const fileName = `BanjaraMatch_v${versionName}_${timestamp}${ext}`;
    cb(null, fileName);
  },
});

// File Filter (only accept APK files)
const fileFilter = (req, file, cb) => {
  console.log(`APK file received: ${file.originalname}, MIME type: ${file.mimetype}`);
  
  const allowedMimeTypes = [
    'application/vnd.android.package-archive',
    'application/octet-stream'
  ];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) || ext === '.apk') {
    cb(null, true); // Accept the file
  } else {
    cb(new Error("Only APK files are allowed!"), false); // Reject the file
  }
};

// Initialize Multer for APK uploads
const apkUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: 100 * 1024 * 1024 // File size limit: 100MB for APK files
  },
});

module.exports = apkUpload;
