require("@nomicfoundation/hardhat-toolbox")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
module.exports = {
    defaultNetwork: "hardhat",
    solidity: {
        version: "0.8.12",
        settings: {
            optimizer: {
                enabled: true,
            },
        },
        evmVersion: "byzantium",
    },
    networks: {
        hardhat: {
            blockGasLimit: 0xfffffff,
            gasPrice: 1,
            initialBaseFeePerGas: 1,
            gas: 0xffffff,
        },
        localhost: {
            url: "http://127.0.0.1:8545/",
            chainId: 31337,
            blockGasLimit: 0xfffffff,
            gasPrice: 1,
            initialBaseFeePerGas: 1,
            gas: 0xffffff,
        },
    },
    gasReporter: {
        enabled: true,
    },
}
