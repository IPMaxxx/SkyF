/**
 * Локальный плагин ESLint этого репозитория.
 *
 * Правила здесь стерегут то, что нельзя выразить настройками готовых плагинов и
 * что уже стоило времени на отладке. Подключается в `eslint.config.mjs` как
 * плагин `skyforest`.
 */
import { noPluginProxyInPromise } from "./no-plugin-proxy-in-promise.mjs";

export const skyforestPlugin = {
  meta: { name: "eslint-plugin-skyforest" },
  rules: {
    "no-plugin-proxy-in-promise": noPluginProxyInPromise,
  },
};

export default skyforestPlugin;
