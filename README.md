# kodi.webinterface.shadowPlayer

An external video player that syncronizes its playback with Kodi.

![Screenshot](https://bytebucket.org/bailus/webinterface.shadowplayer/raw/master/assets/screenshot-small.jpg)


## Links

 * [My Kodi addon repository](http://kodi.bailey.geek.nz/) `http://kodi.bailey.geek.nz/` [(source)](https://bitbucket.org/bailus/kodi-addons)


## Installation
### Installation (Latest version)
The latest version can be installed from within Kodi after installing [Sam's Kodi addon repository](http://kodi.bailey.geek.nz/).

[repository.samsaddons-1.0.1.zip](https://bitbucket.org/bailus/kodi-addons/raw/master/repository.samsaddons-1.0.1.zip)

Download the zip file above then use "Install add-on from zip file" in Kodi to install. More detailed instructions are available [here](http://kodi.wiki/view/HOW-TO:Install_add-ons_from_zip_files) - note that you need to enable the "Unknown Source" option in Settings/System/Add-ons first.

The repository will be added to the "Install from repository" menu in Kodi's Add-on browser.

Then install the Shadow Player addon from within [Kodi](https://kodi.tv/download/) (v18 or above) by going to:

 1. Settings
 2. Add-ons
 3. Install from repository
 4. Sam's Kodi addon repository
 5. Web interface
 6. Shadow Player
 7. Install


## Configuration
See also: http://kodi.wiki/view/web_interface

After installation, Kodi's web interface can be enabled by going to:

 1. Settings
 2. Service Settings
 3. Control

You need to turn on "Allow remote control via HTTP". I use the following settings:

 - Allow remote control via HTTP: `on`
 - Port: `80`
 - Username: `kodi`
 - Password: ` `
 - Web interface: `Shadow Player`

You can then visit `http://localhost/` in your web browser to use Shadow Player. (If this doesn't work, try `http://localhost:8080/`.)


## Usage
To access Kodi from another device on your network you'll need to [find your computer's name](http://its.yale.edu/how-to/article-how-find-your-computers-name) or [ip address](http://its.yale.edu/how-to/article-finding-your-ip-and-network-hardware-addresses).
Then visit `http://<computer name>/` or `http://<ip address>/` in your web browser to use Shadow Player.


## Development
### Installation (Development version)
To install the development version, use [Git](https://git-scm.com/) to clone this repository into your [Kodi plugins directory](http://www.htpcbeginner.com/kodi-folder-location-and-structure/).
Make sure you use the [`--recursive`](https://git-scm.com/book/en/v2/Git-Tools-Submodules) option. "Shadow Player development version" will appear under the "My addons" menu and can be set up like any other web interface.

This version takes a long time to load because the build process happens in the browser.
This means it can be used without running the build command - a feature that lets us rapidly build and test a [http://kangax.github.io/compat-table/](modern) web application without modifying Kodi's basic built-in web server.
To do this, the `index.html` file in the root directory loads [SystemJS](https://github.com/systemjs/systemjs), which uses [jspm](http://jspm.io/) and [Babel](https://babeljs.io/) to download, compile and load the [es7 modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) and their dependencies from within the browser.

Note that styles (CSS) can't be compiled in the browser using [PostCSS-cssnext](http://cssnext.io/) so this version requires a modern browser. Its also slower than the other versions and takes a *very* long time to load.
A faster version can be built using the `npm run build` command (see below).


#### Building
```bash
npm install
jspm install
npm run build
```

A self-contained build will be saved into the `./build` folder.


### Dependencies
#### Development tools
 * [Babel](https://babeljs.io/) - Latest JavaScript (ES7) syntax support
 * [PostCSS-cssnext](http://cssnext.io/) - Latest CSS syntax support
 * [SystemJS](https://github.com/systemjs/systemjs) - Dynamic Module loader
 * [jspm](http://jspm.io/) - Browser package management
 * [npm](https://www.npmjs.com/) - Build tool
 
#### DevOps tools
 * [Bitbucket Pipelines](https://bitbucket.org/product/features/pipelines) - Automatic builds (see [Sam's Kodi addon repository](https://bitbucket.org/bailus/kodi-addons))
