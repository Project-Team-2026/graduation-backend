import { Injectable, NotFoundException } from '@nestjs/common';
import { ExamService } from '../exam/exam.service';
import { AnswerSheetRepository } from '@models/index';
import * as fs from 'fs';
import { Types } from 'mongoose';
import { ProcessingStatus, Tasks } from '@common/index';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

@Injectable()
export class AnswerSheetService {

  constructor(
    private readonly examService: ExamService,
    private readonly answerSheetRepository: AnswerSheetRepository,
    @InjectQueue(Tasks.PNG_CONVERTER)
    private pngConverterQueue: Queue,
  ) {}

  async uploadAnswerSheets(examId: string, files: Express.Multer.File[], userId: string) {
    const examExists = await this.examService.findOne(examId, userId);
    if (!examExists) {
      throw new NotFoundException('Exam not found');
    }

    const folderPath = `exams\\${examId}`;
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    

    // TODO: Save answer sheets to database
    for (const file of files) {

      const filePath = `${folderPath}\\${file.originalname}`;
      // Check if any sheet exists for this exam with similar filename
      const baseFileName = file.originalname.replace(/\.[^/.]+$/, ""); // Remove extension
      const sheetExists = await this.answerSheetRepository.getOne({ examId: new Types.ObjectId(examId), filePath: { $regex: baseFileName } });

      
      if (sheetExists) {
        console.log('Answer sheet already exists');
        continue;
      }

      // move file from temp path to folderPath
      fs.copyFileSync(file.path, filePath);
      // delete temp file
      fs.unlinkSync(file.path);

      // save file path to database
      const answerSheet = await this.answerSheetRepository.create({
        examId: new Types.ObjectId(examId),
        filePath: filePath,
        processingStatus: ProcessingStatus.PENDING
      });

      // add convert png job
      console.log('Adding convert png job');
      this.pngConverterQueue.add(
        Tasks.PNG_CONVERTER,
        {
          filePath: filePath,
          examId,
          answerSheetId: answerSheet._id
        },
        {
          attempts: 3,
          backoff: 5000
        }
      );

    }

    return ` ${files.length} files uploaded successfully`;
  }


  async getAnswerSheets(examId: string, userId: string) {
    const examExists = await this.examService.findOne(examId, userId);
    if (!examExists) {
      throw new NotFoundException('Exam not found');
    }

    const answerSheets = await this.answerSheetRepository.getAll({ examId: new Types.ObjectId(examId) });

    return answerSheets;
  }

  async updateStatus(id: string, status: ProcessingStatus) {
    const answerSheet = await this.answerSheetRepository.findOneAndUpdate({ _id: id }, {
      processingStatus: status
    }, { new: true });
    return answerSheet;
  }
}
