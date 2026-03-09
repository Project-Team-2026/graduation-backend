
import { Tasks } from "@/common";
import { Process, Processor } from "@nestjs/bull";
import type { Job } from "bull";

@Processor(Tasks.DETECT_ID)
export class DetectIdProcessor {

    @Process(Tasks.DETECT_ID)
    async handleDetectId(job: Job) {
        console.log('Detecting ID...', job.data);
    }
    
}