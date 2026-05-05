const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude android cmake build temp dirs from file watching
// to prevent ENOENT crashes when Gradle cleans up temp CMake dirs
config.resolver.blockList = [
  /android[\\/]\.cxx[\\/].*/,
  /android[\\/]build[\\/].*/,
];

module.exports = config;
