module.exports = [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script"
    },
    rules: {
      "no-implicit-globals": "error",
      "no-restricted-globals": [
        "error",
        { name: "DATA", message: "Use appState accessors/proxies via state module." },
        { name: "STORES", message: "Use appState accessors/proxies via state module." },
        { name: "SUPPLIERS", message: "Use appState accessors/proxies via state module." },
        { name: "STORE_INVENTORY", message: "Use appState accessors/proxies via state module." },
        { name: "STORE_BUDGET", message: "Use appState accessors/proxies via state module." },
        { name: "result", message: "Use appState accessors/proxies via state module." }
      ]
    }
  }
];
