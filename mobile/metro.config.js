// Metro en un monorepo con npm workspaces.
//
// Sin esto, Metro solo mira dentro de mobile/ y no encuentra @wheel-vault/shared
// ni las dependencias que npm eleva a la raiz del repositorio.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Vigilar todo el monorepo: al editar shared/, la app recarga.
config.watchFolders = [workspaceRoot];

// Buscar modulos primero en mobile/ y luego en la raiz, donde npm eleva la
// mayoria de los paquetes.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Evita que Metro suba por el arbol de directorios por su cuenta: con las dos
// rutas de arriba ya sabe donde mirar, y la busqueda jerarquica puede resolver
// dos copias de react y romper los hooks.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
