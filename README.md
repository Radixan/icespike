# Ice Spike Simulator
A tool that simulates how Minecraft generates an Ice Spike. Since it was made for didactic purposes, it exposes all the parameters that define the spike shape to be modified by the user. That means that it is not intended to predict how a spike would generate in a given seed or chunk, so some configurations may be impossible to achieve even manipulating the population.

## Dependencies
* [**Tailwind CSS**](https://github.com/tailwindlabs/tailwindcss) - CSS framework.
* [**Iconify**](https://github.com/iconify/iconify) - Icon framework, used for a single icon. 👍
* [**Floating-UI**](https://github.com/floating-ui/floating-ui) - Does popup placement math that I don't want to do.
* [**Three.js**](https://github.com/mrdoob/three.js) - 3D Library.

## Running

You'll need to serve the page since I use JavaScript modules in this project.
If you want to change the styles of the page using Tailwind, I used their CLI to generate [style.css](style.css) from [input.css](input.css).