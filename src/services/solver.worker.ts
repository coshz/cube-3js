import { createCubeAPI, CubeID } from "@coshz/jscube";

const apiPromise = createCubeAPI();

// self.onmessage = async (e: MessageEvent<{ 
//     id:number, 
//     type: 'solvable' | 'solve'; 
//     cube: string;
//     target?: string
// }>) => {
//     const api = await apiPromise;
//     const { id, type, cube, target = CubeID } = e.data;
//     if(type === 'solvable') {
//         self.postMessage({ id, value: api.solvable(cube) });
//     } else if(type === 'solve') {
//         self.postMessage({ id, value: api.trySolve(cube, { target }) });
//     } else {
//         self.postMessage({ id, error: "worker: unknown type" });
//     }
// }

self.onmessage = async (e: MessageEvent<{ 
    id:number, 
    type: 'solvable' | 'solve'; 
    cube: string;
    target?: string
}>) => {
    const { id, type, cube, target = CubeID } = e.data;
    try {
        const api = await apiPromise;
        if(type === 'solvable') {
            self.postMessage({ id, value: api.solvable(cube) });
        } else if(type === 'solve') {
            self.postMessage({ id, value: api.trySolve(cube, { target }) });
        } else {
            self.postMessage({ id, error: "worker: unknown type" });
        }
    } catch(err) {
        self.postMessage({ id, error: (err as Error).message ?? String(err) });
    }
}