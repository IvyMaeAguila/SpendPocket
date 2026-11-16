const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
if (!config.resolver.assetExts.includes('wasm')) config.resolver.assetExts.push('wasm');

// Expo's web renderer also bundles route imports for Node. Use jsPDF's ESM
// build there so Metro does not parse the Node build's AMD require calls.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const target = moduleName === 'jspdf' ? 'jspdf/dist/jspdf.es.min.js' : moduleName;
  return context.resolveRequest(context, target, platform);
};

const enhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const handler = enhanceMiddleware?.(middleware, server) ?? middleware;
  return (request, response, next) => {
    response.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return handler(request, response, next);
  };
};

module.exports = withNativeWind(config, { input: './src/global.css' });
