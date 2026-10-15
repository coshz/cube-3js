import { SolveResult } from '@coshz/jscube';
import SolverWorker from './solver.worker?worker';


let workerInstance: SolverWorker | null = null;
let requestId = 0;
const pendingPromises = new Map<number, { 
    resolve: (val: any) => void; 
    reject: (err: any) => void; 
    timer: number;
}>();

function getWorker(): SolverWorker {
    if(typeof window === 'undefined') {
        throw new Error('Worker can only be instantiated in browser environment.');
    }
    if(!workerInstance) {
        workerInstance = new SolverWorker();

        workerInstance.onmessage = (e: any) => {
            const { id, value, error } = e.data;
            const callbacks = pendingPromises.get(id);
            if(callbacks) {
                if(error) {
                    callbacks.reject(new Error(error));
                } else {
                    callbacks.resolve(value);
                }
                pendingPromises.delete(id);
            }
        }
        workerInstance.onerror = (err: any) => {
            pendingPromises.forEach(({ reject, timer }) => {
                clearTimeout(timer);
                reject(new Error(`Worker Crashed: ${err.message}`));
            });
            pendingPromises.clear();
        }
    }
    return workerInstance;
}

function sendToWorker<T>(
    payload: { type: 'solvable' | 'solve'; cube: string; target?: string},
    timeoutMs = 40_000
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const worker = getWorker();
        const id = ++requestId;
        const timer = setTimeout(() => {
            if(pendingPromises.has(id)) {
                pendingPromises.delete(id);
                reject(new Error(`Worker Request Timed Out (${timeoutMs}ms)`));
            }
        }, timeoutMs) as unknown as number;
        pendingPromises.set(id, { resolve, reject, timer });
        worker.postMessage({ id, ...payload });
    })
}

class Solver {
    static solvableAsync(cube: string): Promise<boolean> {
        return sendToWorker<boolean>({ type: 'solvable', cube });
    }

    static solveAsync(cube: string, target?: string): Promise<SolveResult> {
        return sendToWorker<SolveResult>({ type: 'solve', cube, target });
    }
}

export { Solver };