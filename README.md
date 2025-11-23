# VSCode Repository Visualizer (Repovis)

Repository Visualizer (Repovis), is a Visual Studio Code extension that interactively visualizes the relationships between files.

The visualization is inspired by [Repo Visualizer](https://github.com/githubocto/repo-visualizer), and based on the [CBRV extension](https://github.com/jesse-r-s-hines/CodeBaseRelationshipVisualizer/) by [jesse-r-s-hines](https://github.com/jesse-r-s-hines/)

# Development

To run the project from source run

```bash
npm install
```

then open it up in VSCode and press `F5` to run and debug it.

On Windows, you'll want to enable git symlinks before you clone the repo, first enable "Developer Mode" in Windows
settings and then run

```bash
git config --global core.symlinks true
```

To build and run the tests run

```bash
npm run test
```
