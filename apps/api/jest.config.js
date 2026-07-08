/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^@developer-playground/database$': '<rootDir>/../../packages/database/src',
    '^@developer-playground/shared-types$': '<rootDir>/../../packages/shared-types/src',
    '^@developer-playground/validation$': '<rootDir>/../../packages/validation/src',
    '^@developer-playground/template-engine$': '<rootDir>/../../packages/template-engine/src',
  },
};
