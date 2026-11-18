// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // Uzbek copy uses straight apostrophes everywhere (o'zbek, kunlik, darslar).
      // Escaping every one of them hurts readability, so the rule is off.
      "react/no-unescaped-entities": "off",
    },
  },
]);
