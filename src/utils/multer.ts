
import { diskStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';
import { tmpdir } from 'os';

const storage = diskStorage({
    
    destination: tmpdir(),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + '_' + file.originalname);
    },
});

const fileFilter = (req: any, file: any, cb: any) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(new BadRequestException("Only images and PDFs allowed"), false);
    }
};

export const multerConfig = {
    storage,
    fileFilter
};
