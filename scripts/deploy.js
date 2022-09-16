// simple script that only deploys the smart contract

const { ethers } = require("hardhat")

async function main() {
    //
    console.log("Deploying...")
    const pdfFactory = await ethers.getContractFactory("pdfStorageAndRetrieval")
    const pdfStorage = await pdfFactory.deploy()
    await pdfStorage.deployed()
    console.log("Contract deployed")
}

// main
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
