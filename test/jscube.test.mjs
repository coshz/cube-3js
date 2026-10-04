import { createCubeAPI, CubeID } from "@coshz/jscube";
import { expect, test } from "vitest";

const api = await createCubeAPI();

test("facecube", () => {
    const fR = api.facecube("R");
    expect(fR).toBe("UUFUUFUUFRRRRRRRRRFFDFFDFFDDDBDDBDDBLLLLLLLLLUBBUBBUBB");
});

test("solve", () => {
    const ms = "U F U' L2 R L' D2 B";
    const fc = api.facecube(ms);
    console.log(fc);
    const sol1 = api.solve(fc);
    console.log(sol1);
    expect(api.facecube(sol1,fc)).toBe(CubeID);
    const sol2 = api.solve(CubeID,{target:fc});
    expect(api.facecube(sol2)).toBe(fc);
});