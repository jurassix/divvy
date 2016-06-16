import {relative, resolve, normalize, sep} from 'path';

const renameLiteral = (j, newName) => (path) => {
  j(path).replaceWith(() => j.literal(newName));
};

const filterMatchingPaths = (basedir, filePath) => (path) => {
  return normalize(resolve(basedir, path.value.value)) === filePath;
};

const ensureDotSlash = (filePath = '') => {
  if (filePath[0] !== '.') {
    return `.${sep}${filePath}`;
  }
  return filePath;
};

export default function importDeclarationTransform(file, api, options) {
  const {path: filePath, source} = file;
  const {jscodeshift: j} = api;
  const {prevFilePath, nextFilePath, printOptions = {}} = options;

  const root = j(source);
  const basedir = normalize(resolve(filePath, '../'));
  const matchesPath = filterMatchingPaths(basedir, normalize(prevFilePath));
  const relativeNextFilePath = ensureDotSlash(relative(basedir, nextFilePath));

  if (relativeNextFilePath === '') return null;

  const requires = root
    .find(j.VariableDeclarator, {
      id: {type: 'Identifier'},
      init: {callee: {name: 'require'}},
    })
    .find(j.Literal)
    .filter(matchesPath);

  const imports = root
    .find(j.ImportDeclaration)
    .find(j.Literal)
    .filter(matchesPath);

  [].concat(requires.paths(), imports.paths()).forEach(
    renameLiteral(j, relativeNextFilePath)
  );

  return root.toSource(printOptions);
}