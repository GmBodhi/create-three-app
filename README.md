<div align="center">
  <h1>create-three-app</h1>
  <p>
    <a href="https://www.npmjs.com/package/create-three-app"><img src="https://img.shields.io/npm/v/create-three-app?maxAge=3600" alt="NPM version" /></a>
    <a href="https://www.npmjs.com/package/create-three-app"><img src="https://img.shields.io/npm/dt/create-three-app?maxAge=3600" alt="NPM downloads" /></a>
  </p>
  <p>
    <a href="https://www.npmjs.com/package/create-three-app"><img src="https://nodei.co/npm/create-three-app.png?compact=true" alt="NPM Banner"></a>
  </p>
</div>

## Star the repo?

If you think [this repo](https://github.com/GmBodhi/create-three-app/stargazers) is worth a star✨ just don't hesitate :)

### Note: We don't recommend installing this package globally.

## Usage

#### Run with `--help` flag to know more!

```sh
npx create-three-app {dir_name}
```

or

```sh
yarn create three-app {dir_name}
```

## Using an example from threejs.org/examples

You need to run the command with `-i` or `-e` flag.
Example: \

```sh
# -i or --interactive
npx create-three-app -i

# You can specify the name of the example.
yarn create three-app -e webgl_shader
```

We don't recommend this for beginners, as there can be some bugs that you may have to resolve manually (converting examples to webpack (node) compatible packages is an [automated task](https://github.com/GmBodhi/create-three-app/actions/workflows/examples.yml)) to work everything correctly or even starting the server. You may check `assets.json` for information about unresolved URLs, which may or may not stop the web server from initiating, or the unexpected behaviour of the website.

## Example

[Watch this video](https://user-images.githubusercontent.com/71921036/139236348-f283e2bf-a978-4e07-b000-eb7afd23fec8.mp4)

## Contributing

Thank you for your interest in contributing to this project!
We're interested in adding more examples and maintaining those that are already in use. We're also loking forward for a better webpack configuration system.
All contributions must abide by the [Contributor Covenant Code of Conduct](https://github.com/GmBodhi/create-three-app/blob/master/CODE_OF_CONDUCT.md).

## Want support?

Open an [issue](https://github.com/GmBodhi/create-three-app/issues/new) in the [github repo](https://github.com/GmBodhi/create-three-app) or ask in the [Secret Discord Server](https://discord.gg/qdCknXec83)
