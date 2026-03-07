
import { spawn } from 'child_process';
import { Tasks } from '@common/enums';

export const runPythonScript = (task: Tasks, imgPath: string) => {
    return new Promise((resolve, reject) => {

        const py = spawn('python', [
            "python/main.py",
            imgPath,
            task
        ]);

        let output = '';

        py.stdout.on('data', (data) => {
            output += data.toString();
        });

        py.stderr.on('data', (data) => {
            console.error('Python error:', data.toString());
        });

        py.on('close', (code) => {
            if (code === 0) {
                resolve(output);
            } else {
                reject(new Error(`Script failed with code ${code}`));
            }
        });

    
    });
};