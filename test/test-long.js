const { ethers } = require("hardhat")
const fs = require("fs")
const path = require("path")
const { expect, assert } = require("chai")

describe("pdfStorageAndRetrieval", function () {
    let pdfFactory, pdfStorage
    before(async function () {
        this.timeout(1000 * 60 * 30)
        console.log("Deploying...")
        pdfFactory = await ethers.getContractFactory("pdfStorageAndRetrieval")
        pdfStorage = await pdfFactory.deploy()
        await pdfStorage.deployed()
        console.log("Contract deployed")

        const folder = 3
        var datafolder = path.join("./Training_Data", folder.toString())

        const filenames = await fs.promises.readdir(datafolder)
        console.time("insertion")
        for (let file of filenames) {
            const absolutepath = path.join(datafolder, file)
            if (fs.lstatSync(absolutepath).isDirectory()) {
                let metadata = JSON.parse(fs.readFileSync(path.join(absolutepath, "meta.json")))
                console.log("Inserting PDF from %s ...", path.join(absolutepath, "meta.json"))
                for (i in metadata) {
                    chunkdata = fs.readFileSync(path.join(absolutepath, "chunks", metadata[i]["chunk_file_name"]))
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
        }
        console.timeEnd("insertion")
    })

    it("Should retrieve the proper metadata 1", async function () {
        console.time("getmetadata")
        certMetadata = await pdfStorage.returnCertificateMetadata(["DBMI", "Biomedical Informatics Responsible Conduct of Research", "Jonathan Phillips"], true)
        console.timeEnd("getmetadata")
        decoded = await pdfStorage.decode(certMetadata)
        assert.equal(decoded, "DBMI\tBiomedical Informatics Responsible Conduct of Research\tJonathan Phillips\t06/03/2020\t06/03/2023\t30000000002.pdf\t06/23/2020\t636046\n")
    })

    it("Should retrieve the proper metadata 2", async function () {
        console.time("getmetadata")
        certMetadata = await pdfStorage.returnCertificateMetadata(["DBMI", "*", "Jonathan Phillips"], true)
        console.timeEnd("getmetadata")
        decoded = await pdfStorage.decode(certMetadata)
        assert.equal(decoded, "DBMI\tBiomedical Informatics Responsible Conduct of Research\tJonathan Phillips\t06/03/2020\t06/03/2023\t30000000002.pdf\t06/23/2020\t636046\n")
    })

    it("Should retrieve the proper metadata 3", async function () {
        console.time("getmetadata")
        certMetadata = await pdfStorage.returnCertificateMetadata(["*", "*", "Jonathan Phillips"], true)
        console.timeEnd("getmetadata")
        decoded = await pdfStorage.decode(certMetadata)
        assert.equal(decoded, "DBMI\tBiomedical Informatics Responsible Conduct of Research\tJonathan Phillips\t06/03/2020\t06/03/2023\t30000000002.pdf\t06/23/2020\t636046\n")
    })

    it("Should retrieve the proper metadata 4", async function () {
        console.time("getmetadata")
        certMetadata = await pdfStorage.returnCertificateMetadata(["*", "Biomedical Informatics Responsible Conduct of Research", "Jonathan Phillips"], true)
        console.timeEnd("getmetadata")
        decoded = await pdfStorage.decode(certMetadata)
        assert.equal(decoded, "DBMI\tBiomedical Informatics Responsible Conduct of Research\tJonathan Phillips\t06/03/2020\t06/03/2023\t30000000002.pdf\t06/23/2020\t636046\n")
    })

    it("Should retrieve the proper metadata (nonexpired)", async function () {
        console.time("getmetadata")
        certMetadata = await pdfStorage.returnCertificateMetadata(["DBMI", "Biomedical Data Only Research", "Joseph Nelson"], false)
        console.timeEnd("getmetadata")
        decoded = await pdfStorage.decode(certMetadata)
        assert.equal(decoded, "DBMI\tBiomedical Data Only Research\tJoseph Nelson\t07/30/2017\t07/30/2020\t30000000013.pdf\t08/12/2017\t469569\n")
    })

    it("Should retrieve the proper metadata (expired)", async function () {
        console.time("getmetadata")
        certMetadata = await pdfStorage.returnCertificateMetadata(["DBMI", "Biomedical Data Only Research", "Joseph Nelson"], true)
        console.timeEnd("getmetadata")
        decoded = await pdfStorage.decode(certMetadata)
        assert.equal(decoded, "No certificates matched that query.\n")
    })

    it("Should retrieve the proper metadata (multiple)", async function () {
        console.time("getmetadata")
        certMetadata = await pdfStorage.returnCertificateMetadata(["DBMI", "Biomedical Informatics Research", "Michelle Davis"], false)
        console.timeEnd("getmetadata")
        decoded = await pdfStorage.decode(certMetadata)
        assert.equal(
            decoded,
            "DBMI\tBiomedical Informatics Research\tMichelle Davis\t05/20/2019\t05/20/2022\t30000000203.pdf\t06/12/2019\t832643\nDBMI\tBiomedical Informatics Research\tMichelle Davis\t06/06/2020\t06/06/2023\t30000000204.pdf\t06/07/2020\t834023\n"
        )
    })

    it("Should retrieve the proper metadata (just one)", async function () {
        console.time("getmetadata")
        certMetadata = await pdfStorage.returnCertificateMetadata(["DBMI", "Biomedical Informatics Research", "Michelle Davis"], true)
        console.timeEnd("getmetadata")
        decoded = await pdfStorage.decode(certMetadata)
        assert.equal(decoded, "DBMI\tBiomedical Informatics Research\tMichelle Davis\t06/06/2020\t06/06/2023\t30000000204.pdf\t06/07/2020\t834023\n")
    })

    it("Should retrieve the correct PDF", async function () {
        console.time("getpdf")
        pdfData = await pdfStorage.getCertificatePDF(
            ["DBMI", "Biomedical Informatics Responsible Conduct of Research", "Jonathan Phillips", "06/03/2020", "06/03/2023", "30000000002.pdf", "06/23/2020"],
            true
        )
        console.timeEnd("getpdf")
        assert.equal((pdfData.length - 2) / 2, 636046)
    })

    it("Should retrieve the correct PDF 2", async function () {
        console.time("getpdf")
        pdfData = await pdfStorage.getCertificatePDF(
            ["*", "Biomedical Informatics Responsible Conduct of Research", "Jonathan Phillips", "06/02/2020", "06/03/2023", "30000000002.pdf", "06/23/2020"],
            true
        )
        console.timeEnd("getpdf")
        assert.equal((pdfData.length - 2) / 2, 636046)
    })

    it("Should retrieve the correct PDF 3", async function () {
        console.time("getpdf")
        pdfData = await pdfStorage.getCertificatePDF(["DBMI", "*", "Jonathan Phillips", "06/03/2020", "01/03/2023", "30000000002.pdf", "06/23/2020"], true)
        console.timeEnd("getpdf")
        assert.equal((pdfData.length - 2) / 2, 636046)
    })

    it("Should retrieve the correct PDF 4", async function () {
        console.time("getpdf")
        pdfData = await pdfStorage.getCertificatePDF(["*", "*", "Jonathan Phillips", "06/03/2020", "06/03/2023", "30000000002.pdf", "06/23/2010"], true)
        console.timeEnd("getpdf")
        assert.equal((pdfData.length - 2) / 2, 636046)
    })

    it("Should retrieve the correct PDF 5", async function () {
        console.time("getpdf")
        pdfData = await pdfStorage.getCertificatePDF(["*", "*", "Jonathan Phillips", "*", "06/03/2023", "30000000002.pdf", "06/23/2020"], true)
        console.timeEnd("getpdf")
        assert.equal((pdfData.length - 2) / 2, 636046)
    })

    it("Should retrieve the correct PDF 6", async function () {
        console.time("getpdf")
        pdfData = await pdfStorage.getCertificatePDF(["*", "*", "Jonathan Phillips", "*", "*", "30000000002.pdf", "06/23/2020"], true)
        console.timeEnd("getpdf")
        assert.equal((pdfData.length - 2) / 2, 636046)
    })

    it("Should retrieve the correct PDF 7", async function () {
        console.time("getpdf")
        pdfData = await pdfStorage.getCertificatePDF(["*", "*", "Jonathan Phillips", "*", "*", "*", "06/23/2020"], true)
        console.timeEnd("getpdf")
        assert.equal((pdfData.length - 2) / 2, 636046)
    })

    it("Should retrieve the correct PDF 8", async function () {
        console.time("getpdf")
        pdfData = await pdfStorage.getCertificatePDF(["*", "*", "Jonathan Phillips", "*", "*", "*", "*"], true)
        console.timeEnd("getpdf")
        assert.equal((pdfData.length - 2) / 2, 636046)
    })

    it("Should retrieve the correct PDF (invalid completion date)", async function () {
        console.time("getpdf")
        pdfData = await pdfStorage.getCertificatePDF(
            ["DBMI", "Biomedical Informatics Responsible Conduct of Research", "Jonathan Phillips", "06/04/2020", "06/03/2023", "30000000002.pdf", "06/23/2020"],
            true
        )
        console.timeEnd("getpdf")
        decoded = await pdfStorage.decode(pdfData)
        assert.equal(decoded, "No certificates matched that query.\n")
    })

    it("Should retrieve the correct PDF (invalid expiration date)", async function () {
        console.time("getpdf")
        pdfData = await pdfStorage.getCertificatePDF(
            ["DBMI", "Biomedical Informatics Responsible Conduct of Research", "Jonathan Phillips", "06/03/2020", "06/03/2024", "30000000002.pdf", "06/23/2020"],
            true
        )
        console.timeEnd("getpdf")
        decoded = await pdfStorage.decode(pdfData)
        assert.equal(decoded, "No certificates matched that query.\n")
    })

    it("Should retrieve the correct PDF (invalid filename)", async function () {
        console.time("getpdf")
        pdfData = await pdfStorage.getCertificatePDF(["DBMI", "Biomedical Informatics Responsible Conduct of Research", "Jonathan Phillips", "06/03/2020", "06/03/2023", "???.pdf", "06/23/2020"], true)
        console.timeEnd("getpdf")
        decoded = await pdfStorage.decode(pdfData)
        assert.equal(decoded, "No certificates matched that query.\n")
    })

    it("Should retrieve the correct PDF (invalid upload date)", async function () {
        console.time("getpdf")
        pdfData = await pdfStorage.getCertificatePDF(
            ["DBMI", "Biomedical Informatics Responsible Conduct of Research", "Jonathan Phillips", "06/03/2020", "06/03/2023", "30000000002.pdf", "07/23/2020"],
            true
        )
        console.timeEnd("getpdf")
        decoded = await pdfStorage.decode(pdfData)
        assert.equal(decoded, "No certificates matched that query.\n")
    })

    it("Should retrieve the correct PDF (nonexpired)", async function () {
        console.time("getpdf")
        pdfData = await pdfStorage.getCertificatePDF(["DBMI", "Biomedical Informatics Research", "Nicholas Collins", "02/28/2017", "02/29/2020", "30000000222.pdf", "03/02/2017"], false)
        console.timeEnd("getpdf")
        assert.equal((pdfData.length - 2) / 2, 844516)
    })

    it("Should retrieve the correct PDF (expired)", async function () {
        console.time("getpdf")
        pdfData = await pdfStorage.getCertificatePDF(["DBMI", "Biomedical Informatics Research", "Nicholas Collins", "02/28/2017", "02/29/2020", "30000000222.pdf", "03/02/2017"], true)
        console.timeEnd("getpdf")
        decoded = await pdfStorage.decode(pdfData)
        assert.equal(decoded, "No certificates matched that query.\n")
    })

    it("Should retrieve the correct PDF (latest completion for indiv 1)", async function () {
        console.time("getpdf")
        pdfData = await pdfStorage.getCertificatePDF(["DBMI", "Biomedical Informatics Research", "Michelle Davis", "*", "*", "*", "*"], false)
        console.timeEnd("getpdf")
        assert.equal((pdfData.length - 2) / 2, 834023)
    })

    it("Should retrieve the correct PDF (latest completion for indiv 2)", async function () {
        console.time("getpdf")
        pdfData = await pdfStorage.getCertificatePDF(["DBMI", "*", "Kimberly Turner", "*", "*", "*", "*"], false)
        console.timeEnd("getpdf")
        assert.equal((pdfData.length - 2) / 2, 836332)
    })

    it("Should retrieve the correct PDF (latest completion for indiv 3)", async function () {
        console.time("getpdf")
        pdfData = await pdfStorage.getCertificatePDF(["DBMI", "Biomedical Informatics Research", "Kimberly Turner", "*", "*", "*", "*"], false)
        console.timeEnd("getpdf")
        assert.equal((pdfData.length - 2) / 2, 836332)
    })

    it("Should retrieve the correct PDF (latest completion for indiv 4)", async function () {
        console.time("getpdf")
        pdfData = await pdfStorage.getCertificatePDF(["DBMI", "Biomedical Data Only Research", "Kimberly Turner", "*", "*", "*", "*"], false)
        console.timeEnd("getpdf")
        assert.equal((pdfData.length - 2) / 2, 470463)
    })

    it("Should retrieve the correct PDF (latest completion for all DBMI)", async function () {
        console.time("getpdf")
        pdfData = await pdfStorage.getCertificatePDF(["DBMI", "*", "*", "*", "*", "*", "*"], false)
        console.timeEnd("getpdf")
        assert.equal((pdfData.length - 2) / 2, 469399)
    })
})
