
import { exec } from 'child_process';

export const runPythonScript = () => {
    return new Promise((resolve, reject) => {
        exec('python script.py', (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout);
        });
    });
};