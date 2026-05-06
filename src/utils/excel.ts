import * as ExcelJS from 'exceljs';

export async function generateExcel(data: any[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Exam Results');

  if (data.length === 0) {
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // Get all question numbers from the first row (excluding 'id' and 'score')
  const firstRow = data[0];
  const questionNumbers = Object.keys(firstRow).filter(key => key !== 'id' && key !== 'score').sort((a, b) => parseInt(a) - parseInt(b));

  // Create columns: ID + Score + all questions
  const columns = [
    { header: 'Student ID', key: 'id', width: 15 },
    { header: 'Score', key: 'score', width: 10 }
  ];
  
  questionNumbers.forEach(qNum => {
    columns.push({ header: `Q${qNum}`, key: qNum, width: 15 }); // Increased width for answer+weight
  });

  worksheet.columns = columns;

  // Add rows
  data.forEach((item, rowIndex) => {
    const row: any = { 
      id: item.id,
      score: item.score || 0
    };
    
    questionNumbers.forEach(qNum => {
      const cellData = item[qNum];
      if (typeof cellData === 'object' && cellData !== null) {
        // For model answer row, show answer and weight
        row[qNum] = `${cellData.answer || '-'}(weight: ${cellData.weight || 0})`;
      } else {
        // For student rows, show the answer directly
        row[qNum] = cellData || '-';
      }
    });
    
    worksheet.addRow(row);
    
    // Apply conditional formatting for each cell (skip header row)
    const actualRowIndex = rowIndex + 2; // +2 because header is row 1 and array is 0-indexed
    
    // Color entire row based on score (skip model answer row)
    if (rowIndex > 0) { // Skip first row (model answer)
      const score = item.score || 0;
      const totalScore = data[0].score || 0; // Get total score from model answer
      const passingScore = totalScore / 2; // 50% of total score
      
      const row = worksheet.getRow(actualRowIndex);
      
      if (score >= passingScore) {
        // Pass - green row
        row.eachCell((cell, colNumber) => {
          if (colNumber > 1) { // Skip ID column
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFCCFFCC' } // Light green
            };
          }
        });
      } else {
        // Fail - red row
        row.eachCell((cell, colNumber) => {
          if (colNumber > 1) { // Skip ID column
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFCCCC' } // Light red
            };
          }
        });
      }
    }
    
    questionNumbers.forEach((qNum, colIndex) => {
      const cell = worksheet.getCell(actualRowIndex, colIndex + 3); // +3 because ID and Score are columns 1,2
      const studentAnswer = item[qNum];
      const modelAnswerData = data[0][qNum]; // First row is model answer
      const modelAnswer = typeof modelAnswerData === 'object' ? modelAnswerData.answer : modelAnswerData;
      
      // Override cell color for individual answers (only for student rows, not model answer)
      if (rowIndex > 0) {
        if (studentAnswer === '-') {
          // No answer - darker red
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF9999' } // Darker red
          };
        } else if (studentAnswer === modelAnswer) {
          // Correct answer - darker green
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF99FF99' } // Darker green
          };
        }
      }
      
      // Style model answer row differently
      if (rowIndex === 0) {
        cell.font = { bold: true, color: { argb: 'FF0000FF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0F0' }
        };
      }
      
      // Center align the answers
      cell.alignment = { horizontal: 'center' };
    });
  });

  // Style the header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6B8' }
  };
  
  // Style the model answer row (second row)
  const modelAnswerRow = worksheet.getRow(2);
  modelAnswerRow.font = { bold: true, color: { argb: 'FF0000FF' } }; // Blue text
  modelAnswerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0F0F0' } // Light gray
  };

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    if (column.width) {
      column.width = Math.max(column.width, 10);
    }
  });

  // 🔥 أهم خطوة: نحوله Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  
  // Ensure we always return a Buffer
  return Buffer.from(buffer);
}

export interface QuestionStatistics {
  questionNumber: number;
  questionText?: string;
  correctAnswer: string;
  responses: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
  };
  nonDistractor?: string;
}

export async function generateStatisticsExcel(data: QuestionStatistics[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Question Analysis');

  if (data.length === 0) {
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // Create columns
  const columns = [
    { header: 'No.', key: 'questionNumber', width: 8 },
    { header: 'Question', key: 'questionText', width: 20 },
    { header: 'Correct Answer', key: 'correctAnswer', width: 15 },
    { header: 'A', key: 'responseA', width: 10 },
    { header: 'B', key: 'responseB', width: 10 },
    { header: 'C', key: 'responseC', width: 10 },
    { header: 'D', key: 'responseD', width: 10 },
    { header: 'E', key: 'responseE', width: 10 },
    { header: 'Non Distractor', key: 'nonDistractor', width: 15 }
  ];

  worksheet.columns = columns;

  // Add data rows
  data.forEach((item, index) => {
    const row = worksheet.addRow({
      questionNumber: item.questionNumber,
      questionText: item.questionText || `Question ${item.questionNumber}`,
      correctAnswer: item.correctAnswer,
      responseA: `${item.responses.A}%`,
      responseB: `${item.responses.B}%`,
      responseC: `${item.responses.C}%`,
      responseD: `${item.responses.D}%`,
      responseE: `${item.responses.E}%`,
      nonDistractor: item.nonDistractor || ''
    });

    // Apply conditional formatting
    const rowIndex = index + 2; // +2 because header is row 1 and array is 0-indexed

    // Color correct answer cell (column C)
    const correctAnswerCell = worksheet.getCell(rowIndex, 3);
    correctAnswerCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF90EE90' } // Light green
    };
    correctAnswerCell.font = { bold: true };

    // Color response cells based on correctness and frequency
    const responseColumns = [
      { col: 4, answer: 'A', percentage: item.responses.A },
      { col: 5, answer: 'B', percentage: item.responses.B },
      { col: 6, answer: 'C', percentage: item.responses.C },
      { col: 7, answer: 'D', percentage: item.responses.D },
      { col: 8, answer: 'E', percentage: item.responses.E }
    ];

    responseColumns.forEach(({ col, answer, percentage }) => {
      const cell = worksheet.getCell(rowIndex, col);
      
      if (answer === item.correctAnswer) {
        // Correct answer - green
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF90EE90' } // Light green
        };
      } else if (percentage > 30) {
        // High percentage wrong answer (distractor) - red
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFB6C1' } // Light red
        };
      }
      
      // Center align
      cell.alignment = { horizontal: 'center' };
    });
  });

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' } // Gray
  };
  worksheet.getRow(1).alignment = { horizontal: 'center' };

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    if (column.width) {
      column.width = Math.max(column.width, 10);
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function generateCombinedExcel(resultsData: any[], statisticsData: QuestionStatistics[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // Create Results Sheet
  const resultsWorksheet = workbook.addWorksheet('Results');
  
  if (resultsData.length > 0) {
    // Get all question numbers from the first row (excluding 'id' and 'score')
    const firstRow = resultsData[0];
    const questionNumbers = Object.keys(firstRow).filter(key => key !== 'id' && key !== 'score').sort((a, b) => parseInt(a) - parseInt(b));

    // Create columns: ID + Score + all questions
    const columns = [
      { header: 'Student ID', key: 'id', width: 15 },
      { header: 'Score', key: 'score', width: 10 }
    ];
    
    questionNumbers.forEach(qNum => {
      columns.push({ header: `Q${qNum}`, key: qNum, width: 15 }); // Increased width for answer+weight
    });

    resultsWorksheet.columns = columns;

    // Add rows with coloring
    resultsData.forEach((item, rowIndex) => {
      const row: any = { 
        id: item.id,
        score: item.score || 0
      };
      
      questionNumbers.forEach(qNum => {
        const cellData = item[qNum];
        if (typeof cellData === 'object' && cellData !== null) {
          // For model answer row, show answer and weight
          row[qNum] = `${cellData.answer || '-'}(${cellData.weight || 0})`;
        } else {
          // For student rows, show the answer directly
          row[qNum] = cellData || '-';
        }
      });
      
      resultsWorksheet.addRow(row);
      
      // Apply conditional formatting for each cell (skip header row)
      const actualRowIndex = rowIndex + 2;
      
      // Color entire row based on score (skip model answer row)
      if (rowIndex > 0) { // Skip first row (model answer)
        const score = item.score || 0;
        const totalScore = resultsData[0].score || 0; // Get total score from model answer
        const passingScore = totalScore / 2; // 50% of total score
        
        const row = resultsWorksheet.getRow(actualRowIndex);
        
        if (score >= passingScore) {
          // Pass - green row
          row.eachCell((cell, colNumber) => {
            if (colNumber > 1) { // Skip ID column
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFCCFFCC' } // Light green
              };
            }
          });
        } else {
          // Fail - red row
          row.eachCell((cell, colNumber) => {
            if (colNumber > 1) { // Skip ID column
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFCCCC' } // Light red
              };
            }
          });
        }
      }
      
      questionNumbers.forEach((qNum, colIndex) => {
        const cell = resultsWorksheet.getCell(actualRowIndex, colIndex + 3); // +3 because ID and Score are columns 1,2
        const studentAnswer = item[qNum];
        const modelAnswerData = resultsData[0][qNum];
        const modelAnswer = typeof modelAnswerData === 'object' ? modelAnswerData.answer : modelAnswerData;
        
        // Override cell color for individual answers (only for student rows, not model answer)
        if (rowIndex > 0) {
          if (studentAnswer === '-') {
            // No answer - darker red
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFF9999' } // Darker red
            };
          } else if (studentAnswer === modelAnswer) {
            // Correct answer - darker green
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF99FF99' } // Darker green
            };
          }
        }
        
        // Style model answer row differently
        if (rowIndex === 0) {
          cell.font = { bold: true, color: { argb: 'FF0000FF' } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F0F0' }
          };
        }
        
        cell.alignment = { horizontal: 'center' };
      });
    });

    // Style header row
    resultsWorksheet.getRow(1).font = { bold: true };
    resultsWorksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6B8' }
    };
    
    // Style model answer row
    const modelAnswerRow = resultsWorksheet.getRow(2);
    modelAnswerRow.font = { bold: true, color: { argb: 'FF0000FF' } };
    modelAnswerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' }
    };
  }

  // Create Statistics Sheet
  const statisticsWorksheet = workbook.addWorksheet('Statistics');
  
  if (statisticsData.length > 0) {
    // Create columns
    const columns = [
      { header: 'No.', key: 'questionNumber', width: 8 },
      { header: 'Question', key: 'questionText', width: 20 },
      { header: 'Correct Answer', key: 'correctAnswer', width: 15 },
      { header: 'A', key: 'responseA', width: 10 },
      { header: 'B', key: 'responseB', width: 10 },
      { header: 'C', key: 'responseC', width: 10 },
      { header: 'D', key: 'responseD', width: 10 },
      { header: 'E', key: 'responseE', width: 10 },
      { header: 'Non Distractor', key: 'nonDistractor', width: 15 }
    ];

    statisticsWorksheet.columns = columns;

    // Add data rows with coloring
    statisticsData.forEach((item, index) => {
      const row = statisticsWorksheet.addRow({
        questionNumber: item.questionNumber,
        questionText: item.questionText || `Question ${item.questionNumber}`,
        correctAnswer: item.correctAnswer,
        responseA: `${item.responses.A}%`,
        responseB: `${item.responses.B}%`,
        responseC: `${item.responses.C}%`,
        responseD: `${item.responses.D}%`,
        responseE: `${item.responses.E}%`,
        nonDistractor: item.nonDistractor || ''
      });

      // Apply conditional formatting
      const rowIndex = index + 2;

      // Color correct answer cell
      const correctAnswerCell = statisticsWorksheet.getCell(rowIndex, 3);
      correctAnswerCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF90EE90' } // Light green
      };
      correctAnswerCell.font = { bold: true };

      // Color response cells
      const responseColumns = [
        { col: 4, answer: 'A', percentage: item.responses.A },
        { col: 5, answer: 'B', percentage: item.responses.B },
        { col: 6, answer: 'C', percentage: item.responses.C },
        { col: 7, answer: 'D', percentage: item.responses.D },
        { col: 8, answer: 'E', percentage: item.responses.E }
      ];

      responseColumns.forEach(({ col, answer, percentage }) => {
        const cell = statisticsWorksheet.getCell(rowIndex, col);
        
        if (answer === item.correctAnswer) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF90EE90' } // Light green
          };
        } else if (percentage > 30) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFB6C1' } // Light red
          };
        }
        
        cell.alignment = { horizontal: 'center' };
      });
    });

    // Style header row
    statisticsWorksheet.getRow(1).font = { bold: true };
    statisticsWorksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' } // Gray
    };
    statisticsWorksheet.getRow(1).alignment = { horizontal: 'center' };
  }

  // Add borders to all cells in both sheets
  [resultsWorksheet, statisticsWorksheet].forEach(worksheet => {
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
  });

  // Auto-fit columns in both sheets
  [resultsWorksheet, statisticsWorksheet].forEach(worksheet => {
    worksheet.columns.forEach(column => {
      if (column.width) {
        column.width = Math.max(column.width, 10);
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
