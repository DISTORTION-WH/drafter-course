# Файл `launch.json`

Исходный путь в учебном комплекте: `course/part-02-tooling/examples/dota-match-cli/.vscode/launch.json`.

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CLI",
      "program": "${workspaceFolder}/src/index.js",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}


```