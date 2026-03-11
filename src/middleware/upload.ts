import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import type { Request } from 'express';
import type { FileFilterCallback } from 'multer';
import config from '../config';

const ALLOWED_EXTENSIONS = ['.pem', '.crt', '.cer', '.p12', '.pfx', '.key', '.jks'];

const storage = multer.diskStorage({
  destination(_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) {
    cb(null, config.certUploadDir);
  },
  filename(_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uuid = crypto.randomUUID();
    cb(null, `${uuid}${ext}`);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSizeMB * 1024 * 1024,
  },
});

export default upload;
