const { ethers } = require("hardhat")
const fs = require("fs")
const path = require("path")
const { expect, assert } = require("chai")

describe("pdfStorageAndRetrieval", function () {
    let pdfFactory, pdfStorage
    before(async function () {
        console.log("Deploying...")
        pdfFactory = await ethers.getContractFactory("pdfStorageAndRetrieval")
        pdfStorage = await pdfFactory.deploy()
        await pdfStorage.deployed()
        console.log("Contract deployed")
        const num = 1
        let datafolder = path.join("./Training_Data", num.toString())
        let metadata = JSON.parse(fs.readFileSync(path.join(datafolder, "10000000001", "meta.json")))

        console.time("insertion")
        for (const i in metadata) {
            chunkdata = fs.readFileSync(path.join(datafolder, "10000000001", "chunks", metadata[i]["chunk_file_name"]))
            if (i < 99) {
                await pdfStorage.insertCertificateChunk(
                    [
                        metadata[i]["certificate_type"],
                        metadata[i]["certificate_course_name"],
                        metadata[i]["certificate_user_name"],
                        metadata[i]["certificate_completion_date"],
                        metadata[i]["certificate_expiration_date"],
                        metadata[i]["chunk_file_name"],
                        metadata[i]["file_upload_date"],
                        metadata[i]["file_size"],
                    ],
                    chunkdata
                )
            }
        }
        console.timeEnd("insertion")
    })
    it("Should retrieve the proper metadata", async function () {
        console.time("getmetadata")
        certMetadata = await pdfStorage.returnCertificateMetadata(["DBMI", "Biomedical Informatics Research", "Alexander Jimenez"], true)
        console.timeEnd("getmetadata")
        const decoded = await pdfStorage.decode(certMetadata)
        assert.equal(decoded, "DBMI\tBiomedical Informatics Research\tAlexander Jimenez\t05/10/2022\t05/10/2025\t10000000001.pdf\t06/05/2022\t856912\n")
    })

    it("Should retrieve the correct PDF", async function () {
        console.time("getpdf")
        pdfData = await pdfStorage.getCertificatePDF(["DBMI", "Biomedical Informatics Research", "Alexander Jimenez", "05/10/2022", "05/10/2025", "10000000001.pdf", "06/05/2022"], true)
        console.timeEnd("getpdf")
        assert.equal(pdfData.length, 1713826)
    })
})
