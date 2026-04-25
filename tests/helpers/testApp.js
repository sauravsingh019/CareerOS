const path = require("path");

const clearServerModules = () => {
  Object.keys(require.cache).forEach((cacheKey) => {
    if (cacheKey.includes(`${path.sep}server${path.sep}src${path.sep}`)) {
      delete require.cache[cacheKey];
    }
  });
};

const loadAppWithMocks = (mocks = {}) => {
  clearServerModules();

  Object.entries(mocks).forEach(([relativePath, mockExports]) => {
    const resolvedPath = require.resolve(relativePath);
    require.cache[resolvedPath] = {
      id: resolvedPath,
      filename: resolvedPath,
      loaded: true,
      exports: mockExports
    };
  });

  return require("../../server/src/app");
};

module.exports = {
  loadAppWithMocks,
  clearServerModules
};
