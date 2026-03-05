export enum UserRole {
    USER,
}


export enum ProcessingStatus {
    PENDING,
    PROCESSING,
    DONE,
    FAILED,
}


export enum PythonTask {
    PREPROCESS= "preprocess",
    DETECT_ID= "detect_id",
    ANSWERS= "answers",
}
