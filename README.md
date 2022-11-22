# idash22bc
1st place winning solution to track 1 of the [iDASH 2022 secure genome analysis competition](http://www.humangenomeprivacy.org/2022/)

## Requirements
 - [Nodejs](https://nodejs.org) 
 - [yarn](https://yarnpkg.com/getting-started/install)

## Install
git clone this repo, then:

```
cd idash22bc
yarn
```

## Usage

simple deploy
```
yarn hardhat run scripts/deploy.js
```
Or edit hardhat.config.js with configs for `your_network`, and run
```
yarn hardhat run scripts/deploy.js --network your_network
```


## Test
short test
```
yarn hardhat test test/test-short.js
```
longer test and benchmarks require full training data (simulated PDFs/metadata from iDASH organizers)
```
wget http://files.gersteinlab.org/public-docs/2022/11.22/training_data.tar.gz
tar -xf archive.tar.gz
yarn hardhat test
yarn hardhat run scripts/benchmark1.js
yarn hardhat run scripts/benchmark2.js
yarn hardhat run scripts/benchmark3.js
```