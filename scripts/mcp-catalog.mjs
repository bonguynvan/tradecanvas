// What @tradecanvas/mcp knows, read from the code so it cannot drift from it:
// the built packages for the catalogs (indicators, drawing tools, feature
// switches, style keys, languages, looks), and the TypeScript sources for
// what the constructors of ChartWidget, Chart and ChartWidgetGrid take: each
// option's name, doc, and the values it allows. scripts/gen-ai-docs.mjs
// writes the result to packages/mcp/src/catalog.json.
import ts from 'typescript';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The entry points an agent hands options to, by the class whose constructor takes them. */
const ENTRY_POINTS = [
  ['ChartWidget', 'packages/library/src/widget/ChartWidget.ts'],
  ['Chart', 'packages/library/src/Chart.ts'],
  ['ChartWidgetGrid', 'packages/library/src/widget/ChartWidgetGrid.ts'],
];
/**
 * Nested objects whose keys are worth checking too, by their own types:
 * `Chart.features`, and ChartWidget's `chartOptions`, a `Partial<ChartOptions>`
 * (so without the `plugins` that only Chart's constructor takes).
 */
const NESTED = [['Chart', 'features'], ['ChartWidget', 'chartOptions']];
/** Docs longer than this are cut at a sentence: the tool answers stay short. */
const MAX_DOC = 360;
/** Type text longer than this is cut: the doc says the rest. */
const MAX_TYPE = 160;

const squash = (text) => text.replace(/\s+/g, ' ').trim();
/** TypeScript reports paths with forward slashes; ask for files the same way. */
const sourcePath = (root, file) => join(root, file).replace(/\\/g, '/');

function shortDoc(text) {
  const doc = squash(text);
  if (doc.length <= MAX_DOC) return doc;
  const cut = doc.lastIndexOf('. ', MAX_DOC);
  return cut > 80 ? doc.slice(0, cut + 1) : `${doc.slice(0, MAX_DOC)}…`;
}

function topLevel(program, file, test, what) {
  let found = null;
  ts.forEachChild(program.getSourceFile(file), (node) => {
    if (!found && test(node)) found = node;
  });
  if (!found) throw new Error(`mcp catalog: no ${what} in ${file}`);
  return found;
}

/** The options parameter of a class's constructor: its second. */
function constructorOptions(program, file, className) {
  const cls = topLevel(program, file, (n) => ts.isClassDeclaration(n) && n.name?.text === className, `class ${className}`);
  const ctor = cls.members.find(ts.isConstructorDeclaration);
  const param = ctor?.parameters[1];
  if (!param) throw new Error(`mcp catalog: ${className}'s constructor takes no options`);
  return param;
}

/** A type without `undefined`: what an option takes when it is set. */
function setTypes(type) {
  return (type.isUnion() ? type.types : [type]).filter((t) => !(t.flags & ts.TypeFlags.Undefined));
}

/** The string or number literals a type allows, when it allows nothing else; null otherwise. */
function literals(types) {
  if (!types.length || !types.every((t) => t.isStringLiteral() || t.isNumberLiteral())) return null;
  return types.map((t) => t.value);
}

/**
 * The literals a written type lists, in the order they are written (`'a' |
 * 'b'`, or an alias of one); the checker's own order is the order it met them.
 */
function writtenLiterals(checker, node, depth = 0) {
  if (!node || depth > 4) return null;
  if (ts.isParenthesizedTypeNode(node)) return writtenLiterals(checker, node.type, depth);
  if (ts.isLiteralTypeNode(node)) {
    if (ts.isStringLiteral(node.literal)) return [node.literal.text];
    if (ts.isNumericLiteral(node.literal)) return [Number(node.literal.text)];
    return null;
  }
  if (ts.isUnionTypeNode(node)) {
    const out = [];
    for (const member of node.types) {
      if (member.kind === ts.SyntaxKind.UndefinedKeyword) continue;
      const values = writtenLiterals(checker, member, depth + 1);
      if (!values) return null;
      out.push(...values);
    }
    return out;
  }
  if (ts.isTypeReferenceNode(node)) {
    let symbol = checker.getSymbolAtLocation(node.typeName);
    if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    const alias = symbol?.declarations?.find(ts.isTypeAliasDeclaration);
    return alias ? writtenLiterals(checker, alias.type, depth + 1) : null;
  }
  return null;
}

/** `values` in the written order, when the written type lists exactly them. */
function inWrittenOrder(values, written) {
  if (!written) return values;
  const unique = [...new Set(written)];
  return unique.length === values.length && values.every((v) => unique.includes(v)) ? unique : values;
}

/** The element type node of `T[]`, `readonly T[]` or `Array<T>`. */
function elementNode(node) {
  if (!node) return null;
  if (ts.isTypeOperatorNode(node)) return elementNode(node.type);
  if (ts.isArrayTypeNode(node)) return node.elementType;
  if (ts.isTypeReferenceNode(node) && /^(Readonly)?Array$/.test(node.typeName.getText()) && node.typeArguments?.length === 1) return node.typeArguments[0];
  return null;
}

/** The one plain kind of value a type takes (boolean, number, string, function), if it is that simple. */
function plainKind(checker, types) {
  if (types.every((t) => t.flags & ts.TypeFlags.BooleanLike)) return 'boolean';
  if (types.every((t) => t.flags & ts.TypeFlags.NumberLike)) return 'number';
  if (types.every((t) => t.flags & ts.TypeFlags.String)) return 'string';
  if (types.every((t) => checker.getSignaturesOfType(t, ts.SignatureKind.Call).length > 0)) return 'function';
  return null;
}

function typeText(checker, symbol, declaration, at) {
  const written = declaration?.type ? declaration.type.getText() : checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, at));
  // Doc comments inside an inline type are docs, not type; `import('./widgetUI.js').WidgetUIPreset`
  // reads as `WidgetUIPreset` to a user of the package.
  const text = squash(written.replace(/\/\*[\s\S]*?\*\//g, '')).replace(/import\([^)]*\)\./g, '');
  return text.length > MAX_TYPE ? `${text.slice(0, MAX_TYPE - 3)}…` : text;
}

function describeProperty(checker, symbol, at) {
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
  const types = setTypes(checker.getTypeOfSymbolAtLocation(symbol, at));
  const option = { name: symbol.name, type: typeText(checker, symbol, declaration, at) };
  const doc = shortDoc(ts.displayPartsToString(symbol.getDocumentationComment(checker)));
  if (doc) option.doc = doc;
  const values = literals(types);
  if (values) option.values = inWrittenOrder(values, writtenLiterals(checker, declaration?.type));
  // An array of literals (`chartTypes: ChartType[]`): the values each item may take.
  const arrays = types.filter((t) => checker.isArrayType(t));
  if (arrays.length === types.length && arrays.length) {
    const items = literals(setTypes(checker.getTypeArguments(arrays[0])[0]));
    if (items) option.items = inWrittenOrder(items, writtenLiterals(checker, elementNode(declaration?.type)));
  }
  const kind = values ? null : plainKind(checker, types);
  if (kind) option.kind = kind;
  return option;
}

function readOptions(root) {
  const ohlc = sourcePath(root, 'packages/commons/src/types/ohlc.ts');
  const files = [...ENTRY_POINTS.map(([, file]) => sourcePath(root, file)), ohlc];
  const program = ts.createProgram(files, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  const options = {};
  const nested = {};
  for (const [entry, file] of ENTRY_POINTS) {
    const param = constructorOptions(program, sourcePath(root, file), entry);
    const type = setTypes(checker.getTypeAtLocation(param.type ?? param))[0];
    const props = checker.getPropertiesOfType(type);
    options[entry] = props.map((p) => describeProperty(checker, p, param));
    for (const [owner, key] of NESTED.filter(([o]) => o === entry)) {
      const symbol = props.find((p) => p.name === key);
      if (!symbol) throw new Error(`mcp catalog: ${owner} has no '${key}' option`);
      const inner = setTypes(checker.getTypeOfSymbolAtLocation(symbol, param))[0];
      nested[`${owner}.${key}`] = checker.getPropertiesOfType(inner).map((p) => describeProperty(checker, p, param));
    }
  }
  const known = topLevel(program, ohlc, (n) => ts.isTypeAliasDeclaration(n) && n.name.text === 'KnownTimeFrame', 'KnownTimeFrame');
  const timeframes = writtenLiterals(checker, known.type) ?? [];
  return { options, nested, timeframes };
}

/** Everything the server answers from, as one JSON-ready object. */
export async function buildMcpCatalog(root, indicators) {
  const load = (rel) => import(pathToFileURL(join(root, rel)).href);
  const [core, commons, widget, locales] = await Promise.all([
    load('packages/core/dist/index.js'),
    load('packages/commons/dist/index.js'),
    load('packages/library/dist/widget/index.js'),
    load('packages/library/dist/widget/locales/index.js'),
  ]);
  const tools = [];
  core.registerBuiltInDrawingTools({ register: (tool) => tools.push(tool.descriptor) });
  const { options, nested, timeframes } = readOptions(root);
  return {
    indicators,
    drawingTools: tools.map((d) => ({
      type: d.type,
      name: d.name,
      anchors: d.requiredAnchors,
      ...(d.creation && d.creation !== 'clicks' ? { creation: d.creation } : {}),
      ...(d.options ? { options: Object.fromEntries(Object.entries(d.options).map(([k, o]) => [k, { kind: o.kind, label: o.label, default: o.default }])) } : {}),
    })),
    chartTypes: Object.keys(widget.CHART_TYPE_ICONS),
    timeframes,
    widgetFeatures: [...widget.WIDGET_FEATURES],
    styleKeys: commons.CHART_STYLE_KEYS,
    looks: Object.keys(widget.WIDGET_UI_PRESETS),
    // Built in: the tables the widget has before registerWidgetLocales() adds the rest.
    languages: locales.WIDGET_LANGUAGES.map((l) => ({ code: l.code, name: l.name, builtIn: widget.findWidgetLocale(l.code) !== undefined })),
    options,
    nested,
  };
}
