import { Injectable, NotFoundException } from '@nestjs/common';
import { ExamService } from '../exam/exam.service';
import { AnswerSheetRepository } from 'src/models';
import * as fs from 'fs';
import { Types } from 'mongoose';

@Injectable()
export class AnswerSheetService {

  constructor(
    private readonly examService: ExamService,
    private readonly answerSheetRepository: AnswerSheetRepository
  ) {}

  async uploadAnswerSheets(examId: string, files: Express.Multer.File[]) {
    let count = 0;
    const examExists = await this.examService.findOne(examId);
    if (!examExists) {
      throw new NotFoundException('Exam not found');
    }

    const folderPath = `exams/${examId}/dataSet`;
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // TODO: Save answer sheets to database
    for (const file of files) {
      const filePath = `${folderPath}/${file.originalname}`;
      const sheetExists = await this.answerSheetRepository.getOne({ examId, filePath });
      if (sheetExists) {
        console.log('Answer sheet already exists');
        continue;
      }
      // move file from temp path to folderPath
      fs.copyFileSync(file.path, filePath);
      // delete temp file
      fs.unlinkSync(file.path);

      // save file path to database
      this.answerSheetRepository.create({
        examId: new Types.ObjectId(examId),
        filePath,
      });
      count++;
    }

    return `${count} of ${files.length} answer sheets uploaded successfully`;
  }
}
