import { createCubeApi } from "@coshz/jscube";

const apiPromise = createCubeApi();

self.onmessage = async (e: MessageEvent<{ 
    id:number, 
    type: 'solvable' | 'solve'; 
    cube: string;
    target?: string
}>) => {
    const { id, type, cube } = e.data;
    try {
        const api = await apiPromise;
        if(type === 'solvable') {
            self.postMessage({ id, value: api.solvable(cube) });
        } else if(type === 'solve') {
            self.postMessage({ id, value: api.trySolve(cube, { target: e.data.target ?? api.cubeId, goodEnough: 24 }) });
        } else {
            self.postMessage({ id, error: "worker: unknown type" });
        }
    } catch(err) {
        self.postMessage({ id, error: (err as Error).message ?? String(err) });
    }
}