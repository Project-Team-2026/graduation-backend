import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExamService } from '../exam/exam.service';
import { AnswerSheetRepository } from '@models/index';
import * as fs from 'fs';
import { Types } from 'mongoose';
import { runPythonScript } from '@utils/index';
import { ProcessingStatus, PythonTask } from '@common/index';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

@Injectable()
export class AnswerSheetService {

  constructor(
    private readonly examService: ExamService,
    private readonly answerSheetRepository: AnswerSheetRepository,
    @InjectQueue('preprocessing')
    private preprocessingQueue: Queue,
  ) {}

  async uploadAnswerSheets(examId: string, files: Express.Multer.File[], userId: string) {
    let count = 0;
    const examExists = await this.examService.findOne(examId, userId);
    if (!examExists) {
      throw new NotFoundException('Exam not found');
    }

    const folderPath = `exams/${examId}`;
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    

    // TODO: Save answer sheets to database
    for (const file of files) {

      const filePath = `${folderPath}/${count+1}.${file.originalname.split('.')[1]}`;

      const sheetExists = await this.answerSheetRepository.getOne({ examId, filePath });

      if (sheetExists) {
        console.log('Answer sheet already exists');
        continue;
      }
      // move file from temp path to folderPath
      fs.copyFileSync(file.path, filePath);
      // delete temp file
      fs.unlinkSync(file.path);

      // pefor saving to db, convert pdf to png if pdf (python pdf converter)
      let result = await runPythonScript(PythonTask.PNG_CONVERTER, filePath) as any;
      result = JSON.parse(result);

      if (!result.success) {
        // delete the file if conversion failed
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        throw new BadRequestException("Failed to convert PDF to PNG: " + result.message);
      }


      // save files paths to database
      for (const path of result.data) {
        const answerSheet = await this.answerSheetRepository.create({
          examId: new Types.ObjectId(examId),
          filePath: path,
          processingStatus: ProcessingStatus.PENDING
        });

        // add preprocessing job to queue
        await this.preprocessingQueue.add('run-preprocessing', {
          filePath: path,
          answerSheetId: answerSheet._id
        });
        console.log('Preprocessing job added to queue');

        count++;
      }
    }

    return `${count} answer sheets detected from ${files.length} files successfully`;
  }


  async getAnswerSheets(examId: string, userId: string) {
    const examExists = await this.examService.findOne(examId, userId);
    console.log("examExists", examExists);
    if (!examExists) {
      throw new NotFoundException('Exam not found');
    }

    const answerSheets = await this.answerSheetRepository.getAll({ examId: new Types.ObjectId(examId) },{ filePath: 1 });

    return answerSheets;
  }

  async updateStatus(id: string, status: ProcessingStatus) {
    const answerSheet = await this.answerSheetRepository.findOneAndUpdate({ _id: id }, {
      processingStatus: status
    }, { new: true });
    return answerSheet;
  }
}
