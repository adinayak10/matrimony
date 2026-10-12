const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Define the upload directory
const uploadDir = "uploads/profile_images";

// Check if the directory exists, create it if not
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Upload directory created:", uploadDir);
}

// Configure Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("Destination callback:");
    console.log("Request body:", req.body);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    console.log("Filename callback:");
    console.log("File:", file);
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// File Filter (only accept images)
const fileFilter = (req, file, cb) => {
  console.log(`File received: ${file.originalname}, MIME type: ${file.mimetype}`);
  if (file.mimetype.startsWith("image/")) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error("Only image files are allowed!"), false); // Reject the file
  }
};

// Initialize Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // File size limit: 5MB
});

// // Export Multer middleware
// module.exports = upload.fields([
//   { name: "profile", maxCount: 1 }, // Accept 1 file for profile_image
//   { name: "background_image", maxCount: 1 }, // Accept 1 file for profile_background
// ]);


module.exports = {
  uploadProfileImages: upload.fields([
    { name: "profile", maxCount: 1 },
    { name: "background_image", maxCount: 1 },
  ]),
  uploadUserPhotos: multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  }).array("photos", 10), // up to 10 photos per upload
};
