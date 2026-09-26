import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = process.env.RAG_UPLOAD_DIR || 'uploads/rag';
const MAX_UPLOAD_MB = Number(process.env.RAG_MAX_UPLOAD_MB ?? 10);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // authenticateUser must run BEFORE this middleware so req.user is set
    const userId = req.user?.id || 'anonymous';
    const dir = path.join(process.cwd(), UPLOAD_DIR, String(userId));

    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype !== 'application/pdf') {
    return cb(
      new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only PDF files are allowed.'),
    );
  }

  cb(null, true);
};

/**
 * Multer middleware for handling a single 'file' field PDF upload.
 * Must be used AFTER authenticateUser in the route chain.
 */
export const uploadRagDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_UPLOAD_MB * 1024 * 1024,
  },
}).single('file');

/**
 * Error-handling middleware (4 args, so Express treats it as an error
 * handler) that converts Multer errors into clean JSON 400 responses.
 * Must be placed immediately after uploadRagDocument in the route chain.
 */
export const createDocumentMulterErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        msg: `File is too large. Maximum size is ${MAX_UPLOAD_MB}MB.`,
      });
    }

    return res.status(400).json({
      msg: err.message || 'File upload error.',
    });
  }

  if (err) {
    return res.status(400).json({
      msg: err.message || 'File upload error.',
    });
  }

  next();
};