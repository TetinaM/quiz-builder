import nextJest from "next/jest.js";

// next/jest wires up SWC (matching next.config.ts/tsconfig.json paths, CSS
// module/asset stubbing, .env loading) so tests compile the same way the app
// does — no separate Babel/ts-jest config to keep in sync by hand.
const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
};

export default createJestConfig(config);
