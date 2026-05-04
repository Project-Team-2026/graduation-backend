import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ExamService } from '../exam/exam.service';
import { AnswerSheet, AnswerSheetRepository } from '@models/index';
import * as fs from 'fs';
import { Types } from 'mongoose';
import { ProcessingStatus, SheetStatus, Tasks } from '@common/index';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

@Injectable()
export class AnswerSheetService {

  constructor(
    private readonly examService: ExamService,
    private readonly answerSheetRepository: AnswerSheetRepository,
    @InjectQueue(Tasks.PNG_CONVERTER)
    private readonly pngConverterQueue: Queue,
    @InjectQueue(Tasks.CORRECT_QUESTIONS)
    private readonly correctQuestionsQueue: Queue,
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
        processinStatus: ProcessingStatus.PENDING
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


  async getAnswerSheets(examId: string, userId: string, page: number = 1, limit: number = 10) {
    const examExists = await this.examService.findOne(examId, userId);
    if (!examExists) {
      throw new NotFoundException('Exam not found');
    }

    const skip = (page - 1) * limit;
    
    const answerSheets = await this.answerSheetRepository.getAll(
      { examId: new Types.ObjectId(examId) },
      undefined,
      { skip, limit }
    );


    
    // Check if any sheets are still processing
    const processingSheets = answerSheets.filter(sheet => sheet.processinStatus !== ProcessingStatus.DONE);
    
    // Get total count once
    const totalSheets = await this.answerSheetRepository.count({ examId: new Types.ObjectId(examId) });
    const totalPages = Math.ceil(totalSheets / limit);
    const pagination = {
      currentPage: page,
      totalPages,
      totalItems: totalSheets,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
    
    if (processingSheets.length > 0) {
      return {
        message: "still processing...",
        processingSheets: processingSheets.length,
        totalSheets: answerSheets.length,
        pagination
      };
    }

    return {
      answerSheets,
      pagination
    };
  }

  async getAmbiguousSheets(examId: string, userId: string) {
    const examExists = await this.examService.findOne(examId, userId);
    if (!examExists) {
      throw new NotFoundException('Exam not found');
    }
    
    const answerSheets = await this.answerSheetRepository.getAll(
      { examId: new Types.ObjectId(examId), $or: [{ sheetStatus: SheetStatus.AMBIGUOUS }, { sheetStatus: SheetStatus.MULTIPLE }] },
    );


    
    // Check if any sheets are still processing
    const processingSheets = answerSheets.filter(sheet => sheet.processinStatus !== ProcessingStatus.DONE);
    
    
    if (processingSheets.length > 0) {
      return {
        message: "still processing...",
        processingSheets: processingSheets.length,
        totalSheets: answerSheets.length
      };
    }

    return answerSheets;
  }

  
  async reCorrectAnswerSheet(id: string, userId: string) {
    const answerSheetExists = await this.answerSheetRepository.getOne({ _id: id });
    if (!answerSheetExists) {
      throw new NotFoundException('Answer sheet not found');
    }

    this.addRecorrectJob(answerSheetExists);

    return "correcting...";
  }
  
  async reCorrectAllSheets(examId: string, userId: string) {
    const examExists = await this.examService.findOne(examId, userId);
    if (!examExists) {
      throw new NotFoundException('Exam not found');
    }

    const answerSheets = await this.answerSheetRepository.getAll({ examId: new Types.ObjectId(examId) });
    
    for (const answerSheet of answerSheets) {
      this.addRecorrectJob(answerSheet);
    }
    
    return "correcting...";
  }
  
  async updateStatus(id: string, status: ProcessingStatus) {
    const answerSheet = await this.answerSheetRepository.findOneAndUpdate({ _id: id }, {
      processinStatus: status
    }, { new: true });
    return answerSheet;
  }
  
  private addRecorrectJob(answerSheet: AnswerSheet) {
    if (answerSheet.processinStatus !== ProcessingStatus.DONE && answerSheet.processinStatus !== ProcessingStatus.ANSWERS_DETECTED) {
      throw new ForbiddenException('Sheet is not detected yet');
    }
    
    //add correct questions job
    this.correctQuestionsQueue.add(
      Tasks.CORRECT_QUESTIONS,
      {
        answerSheetId: answerSheet._id
      },
      {
        attempts: 3,
        backoff: 5000
      }
    );  
  }
}
