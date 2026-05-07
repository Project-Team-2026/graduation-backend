import { Controller, Get, Post, Body, Patch, Param, Delete, Res, Req } from '@nestjs/common';
import { ResultsService } from './results.service';
import type { Response } from 'express';
 
@Controller('results')
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

//  @Get('excel/:examId')
//   async downloadExcel(
//     @Req() req: any,
//     @Res({ passthrough: true }) res: Response, 
//     @Param('examId') examId: string
//   ) {
//     const userId = req.user._id;
//     const data = await this.resultsService.createExcel(examId, userId);

//     const buffer = await generateExcel(data);

//     res.set({
//       'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//       'Content-Disposition': `attachment; filename=exam-results-${examId}.xlsx`,
//       'Content-Length': buffer.length.toString(),
//     });

//     res.end(buffer);
//   }

//   @Get('statistics/:examId')
//   async downloadStatistics(
//     @Req() req: any,
//     @Res({ passthrough: true }) res: Response, 
//     @Param('examId') examId: string
//   ) {
//     const userId = req.user._id;
//     const statistics = await this.resultsService.calculateStatistics(examId, userId);

//     const buffer = await generateStatisticsExcel(statistics);

//     res.set({
//       'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//       'Content-Disposition': `attachment; filename=exam-statistics-${examId}.xlsx`,
//       'Content-Length': buffer.length.toString(),
//     });

//     res.end(buffer);
//   }

  @Get('combined/:examId')
  async downloadCombined(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response, 
    @Param('examId') examId: string
  ) {
    const userId = req.user._id;
    const buffer = await this.resultsService.getCombinedExcel(examId, userId);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=exam-combined-${examId}.xlsx`,
      'Content-Length': buffer.length.toString(),
    });

    res.end(buffer);
  }


  @Get('dashboard')
  async dashboard(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const userId = req.user._id;
    const data = await this.resultsService.dashboard(userId);
    return {data};
  }

}
