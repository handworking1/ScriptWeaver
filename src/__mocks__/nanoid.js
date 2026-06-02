// CJS-compatible nanoid mock for Jest
let counter = 0;
module.exports = {
  nanoid: () => `test-id-${++counter}`,
};
