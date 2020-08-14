# net-logger

a _basic_ network status/logging application

### What it does
- uptime logging (via system ping command, piped to a log file)

### Why it exists
**Primary**: To solve a need of simply tracking Internet uptime/downtime to provide
network logs/feedback directly to the ISP or other service provider middleman.

**Secondary** (User Story): To provide a simple application for non-technical users to easily
 start uptime/downtime logging. ie:
   Log to <place>, start logging, stop logging, email file to technical party

A quick Google search revealed many applications that were either
- OS specific (usually Windows) _[not OS agnostic]_
- Provided advanced networking capabilities in an advanced interface _[not suitable for non-technical users]_
- Was not free _[open source is the best source]_

And thus, a simple software engineer set out to solve an already solved problem with altered solution criteria...

### What it might do in the future
- simple speedtest checks and logging
- more ping command options?

### Testing
- no automated testing (who knows if this will ever happen, because lazy)
- manual end-user testing has been performed for MacOS and Windows (x64); other flavors are currently untested and may or may not work

## Development

This application is powered by [Electron](https://www.electronjs.org).

## Pre-Requisites
- [nodejs >=12.8.3](https://nodejs.org)
- [npmjs >=6.14.6](https://www.npmjs.com)
- clone repo
- run `npm install`

### How to run
`npm start`

or

`npm run develop`

to auto-launch dev-tools and enforce NODE_ENV=development (whatever that might mean in the future)

## Bundling/Distribution
`npm run build`

will automatically compile executables for all systems supported by [`electron-packager`](https://github.com/electron/electron-packager). Outputs will go into the `/dist` folder. Highlighted outputs will be:
- MacOS (.app)
- Windows 64-bit (.exe)
- Linux


#### Shortcomings
- the Windows executable(s) output are the expected contents of an application directory, not a single installation executable (which would automatically place the files in the directory for end users). References to `electron-installer-windows` are a (currently) non-working attempt to make this convenience installer.
- the MacOS outputs are unsigned and not suitable for formal distribution

## License
MIT. See [LICENSE.txt](./LICENSE.txt)
