export enum UserRole {
    USER,
}


export enum ProcessingStatus {
    UPLOADED,
    PENDING,
    PROCESSING,
    PREPROCESSED,
    ID_DETECTED,
    ANSWERS_DETECTED,
    DONE,
    FAILED,
}


export enum Tasks {
    PREPROCESS= "preprocess",
    DETECT_ID= "detect_id",
    DETECT_ANSWER= "detect_answers",
    PNG_CONVERTER= "png_converter",
    CORRECT_QUESTIONS= "correct_questions",
}

// answer-status.enum.ts
export enum AnswerStatus {
  ANSWERED,
  UNANSWERED,
  MULTIPLE,
  AMBIGUOUS,
}

export enum BubbleState {
  AMBIGUOUS = 0,
  EMPTY     = 1,
  FILLED    = 2,
}