const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes("wasm")) {
  config.resolver.assetExts.push("wasm");
}

const defaultGetTransformOptions = config.transformer.getTransformOptions;

config.transformer.getTransformOptions = async (...args) => {
  const defaults = defaultGetTransformOptions
    ? await defaultGetTransformOptions(...args)
    : {};

  return {
    ...defaults,
    transform: {
      ...defaults?.transform,
      inlineRequires: true,
    },
  };
};

const defaultEnhanceMiddleware = config.server?.enhanceMiddleware;

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, metroServer) => {
    const middleware = defaultEnhanceMiddleware
      ? defaultEnhanceMiddleware(metroMiddleware, metroServer)
      : metroMiddleware;

    return (req, res, next) => {
      res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
