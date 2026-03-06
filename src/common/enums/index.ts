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


export enum PythonTask {
    PREPROCESS= "preprocess",
    DETECT_ID= "detect_id",
    ANSWERS= "answers",
    PNG_CONVERTER= "png_converter",
}
