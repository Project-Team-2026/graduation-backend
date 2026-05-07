import { ProcessingStatus } from '@/common';
import { AnswerSheetRepository, ExamRepository } from '@/models';
import { generateCombinedExcel, QuestionStatistics } from '@/utils/index';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ObjectId } from 'mongodb';
@Injectable()
export class ResultsService {

  constructor(
    private readonly answerSheetReposatory: AnswerSheetRepository,
    private readonly examReposatory: ExamRepository
  ) {}


  
  async createExcel( examId: string, userId: string ): Promise<any[]> {

    let excelData: any[] = [];
    const answers = [ 'A', 'B', 'C', 'D', 'E' ]

    const examExist = await this.examReposatory.getOne({ _id: new ObjectId(examId), createdBy: new ObjectId(userId) });
    if (!examExist) {
      throw new NotFoundException('Exam not found');
    }

    if( examExist.processingStatus !== ProcessingStatus.DONE){
      throw new NotFoundException('Exam is not processed yet');
    }

    let modelAnswer: any = {};
    modelAnswer['id'] = 'model answer'
    modelAnswer['score'] = examExist.totalMarks
    examExist.answerKey.forEach((answer) => {
      if(answer.answersIndex.length >= 1){
        modelAnswer[answer.questionNumber] = {answer: answers[answer.answersIndex[0]], weight: answer.weight};
      }
    });

    excelData.push(modelAnswer);

    const answerSheets = await this.answerSheetReposatory.getAll({examId: new ObjectId(examId)})
    if(!answerSheets || answerSheets.length < 1){
      throw new NotFoundException('No Sheets Found in this exam')
    }

    for(let i = 0; i < answerSheets.length; i++){
      let answerSheet: any = {};
      answerSheet['id'] = answerSheets[i].studentId
      answerSheet['score'] = answerSheets[i].score

      answerSheets[i].answers.forEach((answer) => {
        if(answer.answersIndex.length >= 1){
          answerSheet[answer.questionNumber] = answers[answer.answersIndex[0]];
        }
      });

      excelData.push(answerSheet);
    }

    console.log(excelData)
    return excelData;
  }

  async calculateStatistics(examId: string, userId: string): Promise<QuestionStatistics[]> {
    const examExist = await this.examReposatory.getOne({ _id: new ObjectId(examId), createdBy: new ObjectId(userId) });
    if (!examExist) {
      throw new NotFoundException('Exam not found');
    }

    if (examExist.processingStatus !== ProcessingStatus.DONE) {
      throw new NotFoundException('Exam is not processed yet');
    }

    const answerSheets = await this.answerSheetReposatory.getAll({ examId: new ObjectId(examId) });
    if (!answerSheets || answerSheets.length < 1) {
      throw new NotFoundException('No Sheets Found in this exam');
    }

    const answers = ['A', 'B', 'C', 'D', 'E'];
    const statistics: QuestionStatistics[] = [];

    // Get correct answers from exam
    const correctAnswers: { [key: number]: string } = {};
    examExist.answerKey.forEach(answer => {
      if (answer.answersIndex.length >= 1) {
        correctAnswers[answer.questionNumber] = answers[answer.answersIndex[0]];
      }
    });

    // Calculate statistics for each question
    examExist.answerKey.forEach(question => {
      const qNum = question.questionNumber;
      const correctAnswer = correctAnswers[qNum];

      // Count responses for each option
      const responseCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
      let totalResponses = 0;

      answerSheets.forEach(sheet => {
        const studentAnswer = sheet.answers.find(a => a.questionNumber === qNum);
        if (studentAnswer && studentAnswer.answersIndex.length >= 1) {
          const answer = answers[studentAnswer.answersIndex[0]];
          if (answer && responseCounts.hasOwnProperty(answer)) {
            responseCounts[answer]++;
            totalResponses++;
          }
        }
      });

      // Calculate percentages
      const totalStudents = answerSheets.length;
      const percentages = {
        A: totalResponses > 0 ? Math.round((responseCounts.A / totalStudents) * 100) : 0,
        B: totalResponses > 0 ? Math.round((responseCounts.B / totalStudents) * 100) : 0,
        C: totalResponses > 0 ? Math.round((responseCounts.C / totalStudents) * 100) : 0,
        D: totalResponses > 0 ? Math.round((responseCounts.D / totalStudents) * 100) : 0,
        E: totalResponses > 0 ? Math.round((responseCounts.E / totalStudents) * 100) : 0
      };

      // Find non-distractor (option with 0% or very low percentage)
      const nonDistractor = Object.entries(percentages)
        .filter(([_, percentage]) => percentage < 5)
        .map(([option, _]) => option)
        .join(', ') || '-';

      statistics.push({
        questionNumber: qNum,
        questionText: `Question ${qNum}`,
        correctAnswer: correctAnswer || '-',
        responses: percentages,
        nonDistractor: nonDistractor
      });
    });

    return statistics.sort((a, b) => a.questionNumber - b.questionNumber);
  }

  async getCombinedExcel(examId: string, userId: string): Promise<Buffer> {
    // Get results data
    const resultsData = await this.createExcel(examId, userId);
    
    // Get statistics data
    const statisticsData = await this.calculateStatistics(examId, userId);
    
    // Generate combined Excel
    return await generateCombinedExcel(resultsData, statisticsData);
  }

  async dashboard(userId: string): Promise<any> {

    const createdBy = new ObjectId(userId);

    const [
      totalExams,
      totalSheets,
      processedSheets,
      failedSheets,
      pendingSheets,
      avgScoreResult,
      lastExamCreated,
      lastExamUpdated,
      idConflictedSheets,
      uploadOverTime
    ] = await Promise.all([
      // Get exams count
      this.examReposatory.count({ createdBy }),

      // Get answer sheets count
      this.answerSheetReposatory.count({ createdBy }),
      
      // Get processed sheets count
      this.answerSheetReposatory.count({
        createdBy,
        processinStatus: ProcessingStatus.DONE
      }),

      // Get failed sheets count
      this.answerSheetReposatory.count({
        createdBy,
        processinStatus: ProcessingStatus.FAILED
      }),
      
      // Get pending sheets count
      this.answerSheetReposatory.count({
        createdBy,
        processinStatus: ProcessingStatus.PENDING
      }),
  
      // Average score aggregation
      this.answerSheetReposatory.aggregate([
        {
          $match: {
            createdBy,
            processinStatus: ProcessingStatus.DONE
          }
        },
        {
          $group: {
            _id: null,
            avg: { $avg: "$score" }
          }
        }
      ]),
  
      // last exam created
      this.examReposatory.getOne({ createdBy }, { sort: { createdAt: -1 } }),
      // last exam updated
      this.examReposatory.getOne({ createdBy }, { sort: { updatedAt: -1 } }),

      // Get conflicted sheets count
      this.answerSheetReposatory.count({ createdBy, idConflict: true }),

      // Upload over time for last month
      this.answerSheetReposatory.aggregate([
        {
          $match: {
            createdBy,
            createdAt: {
              $gte: new Date(new Date().setDate(new Date().getDate() - 30))
            }
          }
        },
        {
          $group: {
            _id: {
              day: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt"
                }
              }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: {
            "_id.day": 1
          }
        }
      ])
       
    ]);
    
    const avgScore = Number(
      (avgScoreResult[0]?.avg || 0).toFixed(2)
    );

    const successRate =
      totalSheets > 0
      ? Number(((processedSheets / totalSheets) * 100).toFixed(1))
      : 0;

    return { 

      cards: {
        totalExams, 
        totalSheets,
        processedSheets, 
        failedSheets, 
        pendingSheets,
        avgScore
      },

      charts: {
        sheetsProcessingStatus: {
          processedSheets,
          successRate,
          failedSheets,
          pendingSheets,
        },

        uploadOverTime: uploadOverTime.map(item => ({
        date: item._id.day,
        count: item.count
      }))
      },

      lastExamCreated, 
      lastExamUpdated,
      idConflictedSheets,

    };
  }
  
}
