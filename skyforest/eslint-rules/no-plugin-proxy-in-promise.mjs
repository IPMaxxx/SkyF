/**
 * Прокси плагина Capacitor не должен пересекать границу промиса.
 *
 * `registerPlugin()` (и любой экспорт-плагин из пакета `@capacitor/*`,
 * `@capgo/*`, `@aparajita/*`) отдаёт Proxy, который на обращение к ЛЮБОМУ
 * свойству отвечает вызовом нативного метода с этим именем — в ядре исключения
 * сделаны только для `$$typeof` и `toJSON`. Свойство `then` спрашивает не
 * программист, а движок: `return api` из async-функции, `resolve(api)`,
 * `Promise.all([api])`, `await api` обязаны проверить, не thenable ли значение.
 * Найдя функцию `then`, движок зовёт её и ждёт своих продолжений. Прокси вместо
 * этого уходит на мост, получает «X.then() is not implemented», а продолжения
 * не зовёт никто: обещание не разрешается и не отклоняется никогда. Ни
 * исключения, ни отказа, ни таймаута — тихое вечное зависание, которое снаружи
 * выглядит как «кнопка не работает».
 *
 * Дважды стоило дорого: полтора дня на «фоновая запись не включается» в WayBack
 * и молчащее нативное «Поделиться» в Mushroom Checker. В браузере этого не
 * видно вовсе — плагинов там нет, и весь код идёт запасным путём.
 *
 * Лечится обычным объектом с нужными методами: `plainApi(api, [...])` из
 * `@/lib/native/plainApi`. У него нет `then`, и проверка движка заканчивается
 * сразу.
 *
 * Почему правило по дереву разбора, а не по регулярным выражениям: проверка
 * `fastlane/.plugin-proxy-check.mjs` ловит прямой `return proxy`, но прокси в
 * `Promise.all`, прокси, проброшенный через несколько переменных, и прокси в
 * аргументе `resolve()` для неё невидимы. Здесь значение отслеживается по
 * присваиваниям: откуда пришло, через что прошло и куда отдано.
 *
 * Самопроверка правила: `node scripts/verify-plugin-proxy-rule.mjs`.
 */

/** Пакеты, из которых приезжают прокси плагинов. */
const PLUGIN_PACKAGE = /^(?:@capacitor|@capgo|@aparajita)\//;

/** Функция, после которой значение прокси уже не является. */
const SANITIZER = "plainApi";

/**
 * Экспорты плагинных пакетов, которые прокси НЕ являются: ядро, классы,
 * перечисления. Список нужен, потому что по имени прокси от enum не отличить —
 * оба приходят из одного пакета и оба с большой буквы. Ошибка в сторону
 * «не прокси» безопаснее: правило промолчит там, где значение и так безвредно.
 */
const NOT_A_PLUGIN = new Set([
  "Capacitor",
  "CapacitorCookies",
  "CapacitorException",
  "CapacitorHttp",
  "CapacitorPlatforms",
  "WebPlugin",
  "WebView",
  "ExceptionCode",
  "PermissionState",
  "Directory",
  "Encoding",
  "FilesystemDirectory",
  "FilesystemEncoding",
  "CameraResultType",
  "CameraSource",
  "CameraDirection",
  "BiometryType",
  "BiometryError",
  "BiometryErrorType",
  "Style",
  "StatusBarStyle",
  "StatusBarAnimation",
  "KeyboardStyle",
  "PresentationStyle",
]);

/** Статические методы Promise, которые проверяют аргумент на thenable. */
const PROMISE_STATICS = new Set(["resolve", "all", "allSettled", "race", "any"]);

/** Методы, чьи колбэки отдают значение движку как результат обещания. */
const THEN_METHODS = new Set(["then", "catch", "finally"]);

const FUNCTION_TYPES = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
]);

const UNWRAP_TYPES = new Set([
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "TSTypeAssertion",
  "TSInstantiationExpression",
]);

function isFunction(node) {
  return FUNCTION_TYPES.has(node.type);
}

function nameOf(node) {
  if (!node) return null;
  if (node.type === "Identifier") return node.name;
  if (node.type === "Literal") return typeof node.value === "string" ? node.value : null;
  return null;
}

/** Имя, под которым прокси плагина приезжает из пакета. */
function looksLikePluginExport(name) {
  return Boolean(name) && /^[A-Z]/.test(name) && !NOT_A_PLUGIN.has(name);
}

function isPluginPackage(node) {
  const source = nameOf(node);
  return Boolean(source) && PLUGIN_PACKAGE.test(source);
}

/** Дети узла — для собственного обхода, где под рукой есть и область, и родитель. */
function childNodes(node) {
  const out = [];
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item.type === "string") out.push(item);
      }
    } else if (value && typeof value.type === "string") {
      out.push(value);
    }
  }
  return out;
}

export const noPluginProxyInPromise = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Прокси плагина Capacitor не отдаётся через промис: движок спросит у него then и не получит ответа никогда",
    },
    schema: [],
    messages: {
      crossing:
        "Прокси плагина Capacitor пересекает границу промиса ({{where}}). Движок спросит у значения `then`, прокси ответит вызовом на мост, и ожидание не кончится ни значением, ни ошибкой — приложение зависнет молча. Отдавайте наружу обычный объект: plainApi(<плагин>, [...методы]) из @/lib/native/plainApi.",
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const scopeManager = sourceCode.scopeManager;

    /** Переменная -> «proxy» (сам прокси) либо «module» (пространство имён пакета). */
    const kinds = new Map();
    /** Переменные, которыми `new Promise` отдаёт значение наружу. */
    const resolvers = new Set();
    /** Присваивания, разобранные первым проходом: откуда переменная берёт значение. */
    const sources = [];

    /**
     * Область видимости узла. Именно внутренняя: у Program их две — глобальная и
     * модульная, а импорты и объявления верхнего уровня живут во второй.
     */
    function scopeOf(node) {
      return scopeManager.acquire(node, true) ?? scopeManager.acquire(node) ?? null;
    }

    function resolveVariable(name, scope) {
      for (let current = scope; current; current = current.upper) {
        const found = current.set.get(name);
        if (found) return found;
      }
      return null;
    }

    function kindOfIdentifier(node, scope) {
      const variable = resolveVariable(node.name, scope);
      return variable ? (kinds.get(variable) ?? null) : null;
    }

    /**
     * Откуда пришло значение: «proxy», «module» или ниоткуда.
     *
     * Пространство имён модуля прокси не является (у него нет `then`), но именно
     * из него прокси и достают — поэтому оба вида приходится различать.
     */
    function classify(node, scope) {
      if (!node) return null;
      if (UNWRAP_TYPES.has(node.type)) return classify(node.expression, scope);
      switch (node.type) {
        case "AwaitExpression":
          return classify(node.argument, scope);
        case "ImportExpression":
          return isPluginPackage(node.source) ? "module" : null;
        case "Identifier":
          return kindOfIdentifier(node, scope);
        case "MemberExpression":
          return classify(node.object, scope) === "module" &&
            looksLikePluginExport(nameOf(node.property))
            ? "proxy"
            : null;
        case "ConditionalExpression":
          return classify(node.consequent, scope) ?? classify(node.alternate, scope);
        case "LogicalExpression":
          return classify(node.left, scope) ?? classify(node.right, scope);
        case "CallExpression":
          return classifyCall(node, scope);
        default:
          return null;
      }
    }

    function classifyCall(node, scope) {
      const callee = node.callee.type === "MemberExpression" ? node.callee.property : node.callee;
      const called = nameOf(callee);
      // Прошло через plainApi — наружу уходит копия, а не прокси.
      if (called === SANITIZER) return null;
      if (called === "registerPlugin") return "proxy";
      // Обёртки вроде loadChunk(KEY, () => import("@capacitor/app")) отдают то же
      // пространство имён, что и сам import.
      for (const arg of node.arguments) {
        if (classify(arg, scope) === "module") return "module";
        if (isFunction(arg) && arg.body && classify(arg.body, scope) === "module") return "module";
      }
      return null;
    }

    /** Что даёт источник конкретной переменной: prop — имя ключа при разборе объекта. */
    function kindOfSource(expr, prop, scope) {
      const kind = classify(expr, scope);
      if (prop === null) return kind;
      if (kind !== "module") return null;
      return looksLikePluginExport(prop) ? "proxy" : null;
    }

    function raise(variable, kind) {
      if (!variable || !kind) return false;
      const now = kinds.get(variable);
      if (now === kind || now === "proxy") return false;
      kinds.set(variable, kind);
      return true;
    }

    function bindPattern(target, expr, scope) {
      if (!target) return;
      if (target.type === "Identifier") {
        sources.push({ variable: resolveVariable(target.name, scope), expr, prop: null, scope });
        return;
      }
      if (target.type === "ObjectPattern") {
        for (const property of target.properties) {
          if (property.type !== "Property" || property.value.type !== "Identifier") continue;
          sources.push({
            variable: resolveVariable(property.value.name, scope),
            expr,
            prop: nameOf(property.key),
            scope,
          });
        }
      }
    }

    function collectImport(node, scope) {
      if (!isPluginPackage(node.source) || node.importKind === "type") return;
      for (const specifier of node.specifiers) {
        const variable = resolveVariable(specifier.local.name, scope);
        if (!variable) continue;
        if (specifier.type === "ImportNamespaceSpecifier") {
          kinds.set(variable, "module");
          continue;
        }
        if (specifier.type === "ImportSpecifier" && specifier.importKind === "type") continue;
        const imported = nameOf(specifier.imported) ?? specifier.local.name;
        if (looksLikePluginExport(imported)) kinds.set(variable, "proxy");
      }
    }

    /** `new Promise((resolve) => …)`: первый параметр отдаёт значение движку. */
    function collectResolver(node) {
      if (nameOf(node.callee) !== "Promise") return;
      const executor = node.arguments[0];
      if (!executor || !isFunction(executor)) return;
      const param = executor.params[0];
      if (!param || param.type !== "Identifier") return;
      const variable = scopeOf(executor)?.set.get(param.name);
      if (variable) resolvers.add(variable);
    }

    /** Обход с явными областью видимости и родителем: оба нужны, и оба знает только он. */
    function walk(node, state, visit) {
      const scope = scopeOf(node) ?? state.scope;
      const here = { scope, parent: state.parent, fn: state.fn, fnParent: state.fnParent };
      visit(node, here);
      const inner = isFunction(node)
        ? { scope, parent: node, fn: node, fnParent: state.parent }
        : { scope, parent: node, fn: state.fn, fnParent: state.fnParent };
      for (const child of childNodes(node)) walk(child, inner, visit);
    }

    function isThenCallback(fn, fnParent) {
      if (!fn || !fnParent || fnParent.type !== "CallExpression") return false;
      if (fnParent.callee.type !== "MemberExpression") return false;
      if (!THEN_METHODS.has(nameOf(fnParent.callee.property))) return false;
      return fnParent.arguments.includes(fn);
    }

    function report(node, where) {
      context.report({ node, messageId: "crossing", data: { where } });
    }

    /** Значение, отданное как результат функции: и `return`, и короткое тело стрелки. */
    function checkHandout(value, scope, fn, fnParent) {
      if (!value || classify(value, scope) !== "proxy") return;
      if (fn?.async) {
        report(value, "возврат из async-функции");
      } else if (isThenCallback(fn, fnParent)) {
        report(value, "возвращаемое значение .then()");
      }
    }

    return {
      "Program:exit"(program) {
        const root = { scope: scopeOf(program) ?? scopeManager.globalScope };

        // Проход первый: откуда берутся значения.
        walk(program, root, (node, state) => {
          switch (node.type) {
            case "ImportDeclaration":
              collectImport(node, state.scope);
              break;
            case "NewExpression":
              collectResolver(node);
              break;
            case "VariableDeclarator":
              bindPattern(node.id, node.init, state.scope);
              break;
            case "AssignmentExpression":
              if (node.operator === "=") bindPattern(node.left, node.right, state.scope);
              break;
            default:
              break;
          }
        });

        // Значение может пройти через несколько имён, поэтому источники
        // перечитываются до тех пор, пока что-то меняется.
        let changed = true;
        while (changed) {
          changed = false;
          for (const { variable, expr, prop, scope } of sources) {
            if (raise(variable, kindOfSource(expr, prop, scope))) changed = true;
          }
        }

        // Проход второй: куда значения отдают.
        walk(program, root, (node, state) => {
          switch (node.type) {
            case "AwaitExpression":
              if (classify(node.argument, state.scope) === "proxy") {
                report(node.argument, "await");
              }
              break;
            case "ReturnStatement":
              checkHandout(node.argument, state.scope, state.fn, state.fnParent);
              break;
            case "ArrowFunctionExpression":
              if (node.body.type !== "BlockStatement") {
                checkHandout(node.body, state.scope, node, state.parent);
              }
              break;
            case "CallExpression": {
              const callee = node.callee;
              if (
                callee.type === "MemberExpression" &&
                nameOf(callee.object) === "Promise" &&
                PROMISE_STATICS.has(nameOf(callee.property))
              ) {
                for (const arg of node.arguments) {
                  const items = arg.type === "ArrayExpression" ? arg.elements : [arg];
                  for (const item of items) {
                    if (item && classify(item, state.scope) === "proxy") {
                      report(item, `Promise.${nameOf(callee.property)}()`);
                    }
                  }
                }
                break;
              }
              if (callee.type === "Identifier") {
                const variable = resolveVariable(callee.name, state.scope);
                if (variable && resolvers.has(variable)) {
                  for (const arg of node.arguments) {
                    if (classify(arg, state.scope) === "proxy") report(arg, "resolve() у new Promise");
                  }
                }
              }
              break;
            }
            default:
              break;
          }
        });
      },
    };
  },
};

export default noPluginProxyInPromise;
