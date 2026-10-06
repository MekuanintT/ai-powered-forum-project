import multer from 'multer';

const MAX_FILE_SIZE = Number(process.env.RAG_MAX_UPLOAD_MB || 10) * 1024 * 1024;

const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, callback) => {
    const extension = file.originalname.toLowerCase().split('.').pop();
    const isPdf = file.mimetype === 'application/pdf' || extension === 'pdf';
    const isText = file.mimetype === 'text/plain' || extension === 'txt';

    if (!isPdf && !isText) {
      const error = new Error('Only PDF and TXT files are allowed.');
      error.statusCode = 400;
      return callback(error);
    }

    callback(null, true);
  },
}).single('file');

export const createDocumentMulterErrorHandler = (req, res, next) => {
  uploadDocument(req, res, error => {
    if (error) {
      error.statusCode = error instanceof multer.MulterError ? 400 : error.statusCode || 400;
      return next(error);
    }

    if (!req.file) {
      const missingFileError = new Error('A PDF or TXT file is required.');
      missingFileError.statusCode = 400;
      return next(missingFileError);
    }

    next();
  });
};