import { CubeApi, createCubeApi, SolveResult } from '@coshz/jscube';

let apiInstancePromise: Promise<CubeApi> | null = null;
const getRawApi = (): Promise<CubeApi> => apiInstancePromise ??= createCubeApi();

const initPromiseMap = new Map<boolean, Promise<CubeApi>>();
const getInitedApi = (useSymmetry: boolean): Promise<CubeApi> => {
    if (!initPromiseMap.has(useSymmetry)) {
        const promise = (async () => {
            const api = await getRawApi();
            console.log(`Initializing solver engine (symmetry: ${useSymmetry})...`);
            await api.init(useSymmetry);
            console.log("Solver engine is initialized.");
            return api;
        })();
        initPromiseMap.set(useSymmetry, promise);
    }
    return initPromiseMap.get(useSymmetry)!;
};

const solvable = async (cube: string) => (await getRawApi()).solvable(cube);
const solveCore = async (useSymmetry: boolean, srcCube: string, tgtCube?: string) => {
    const api = await getInitedApi(useSymmetry);
    if (!tgtCube) tgtCube = api.cubeId;
    return api.solve(srcCube, { target: tgtCube });
}
const abort = () => getRawApi().then(api => api.abort());

const Solver = {
    solve: (srcCube: string, tgtCube?: string) => solveCore(false, srcCube, tgtCube),
    solvable, abort
};

const SolverSym = {
    solve: (srcCube: string, tgtCube?: string) => solveCore(true, srcCube, tgtCube),
    solvable, abort
}

export { Solver, SolverSym };
