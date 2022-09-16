// this benchmark inserts 1000 PDFs, 250 each from 4 different addresses, then does query 1 and 2 after each insertion
// tracks insertion time per chunk, insertion time per PDF, query 1 time, query 2 time

const { ethers } = require("hardhat")
const fs = require("fs")
const path = require("path")
const { expect, assert } = require("chai")

async function main() {
    //
    console.log("Deploying...")
    const pdfFactory = await ethers.getContractFactory("pdfStorageAndRetrieval")
    const pdfStorage = await pdfFactory.deploy()
    await pdfStorage.deployed()
    console.log("Contract deployed")
    var t0, t1
    var pdfinsertiontime = []
    var chunkinsertiontime = []
    var query1time_same = []
    var query1time_different = []
    var query2time_same = []
    var query2time_different = []
    var outputsizes = []
    var chunkorder = []
    var filesizes = []

    const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners()

    const addresses = [addr1, addr2, addr3, addr4]
    const folders = [1, 2, 3, 4]
    for (var j = 0; j < 4; j++) {
        var datafolder = path.join("./Training_Data", folders[j].toString())

        const filenames = await fs.promises.readdir(datafolder)
        for (let file of filenames) {
            const absolutepath = path.join(datafolder, file)
            if (fs.lstatSync(absolutepath).isDirectory()) {
                let metadata = JSON.parse(fs.readFileSync(path.join(absolutepath, "meta.json")))
                console.log(path.join(absolutepath, "meta.json"))
                t2 = performance.now()
                for (i in metadata) {
                    chunkdata = fs.readFileSync(path.join(absolutepath, "chunks", metadata[i]["chunk_file_name"]))
                    t0 = performance.now()
                    await pdfStorage
                        .connect(addresses[j])
                        .insertCertificateChunk(
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
                    t1 = performance.now()
                    chunkinsertiontime.push(t1 - t0)
                    chunkorder.push(i)
                }
                filesizes.push(metadata[0]["file_size"])
                t3 = performance.now()
                pdfinsertiontime.push(t3 - t2)
                console.log("Insertion: %s", t3 - t2)

                // same result query 1
                t0 = performance.now()
                certMetadata = await pdfStorage.returnCertificateMetadata(["DBMI", "Biomedical Informatics Research", "Alexander Jimenez"], true)
                t1 = performance.now()
                decoded = await pdfStorage.decode(certMetadata)
                assert.equal(decoded, "DBMI\tBiomedical Informatics Research\tAlexander Jimenez\t05/10/2022\t05/10/2025\t10000000001.pdf\t06/05/2022\t856912\n")
                console.log(t1 - t0)
                query1time_same.push("query1 same: %s", t1 - t0)

                // different results query 1
                t0 = performance.now()
                certMetadata = await pdfStorage.returnCertificateMetadata(["DBMI", "*", "*"], false)
                t1 = performance.now()
                query1time_different.push(t1 - t0)
                console.log("query1 different: %s", t1 - t0)
                outputsizes.push(certMetadata.length)

                //same results query 2
                t0 = performance.now()
                pdfData = await pdfStorage.getCertificatePDF(["DBMI", "Biomedical Informatics Research", "Alexander Jimenez", "05/10/2022", "*", "*", "06/05/2022"], true)
                t1 = performance.now()
                assert.equal(pdfData.length, 1713826)
                query2time_same.push(t1 - t0)
                console.log("query2 same: %s", t1 - t0)

                //different results query 2
                t0 = performance.now()
                pdfData = await pdfStorage.getCertificatePDF(
                    [
                        metadata[0]["certificate_type"],
                        metadata[0]["certificate_course_name"],
                        metadata[0]["certificate_user_name"],
                        metadata[0]["certificate_completion_date"],
                        metadata[0]["certificate_expiration_date"],
                        metadata[0]["file_name"],
                        metadata[0]["file_upload_date"],
                    ],
                    false
                )
                t1 = performance.now()
                assert.equal((pdfData.length - 2) / 2, metadata[0]["file_size"])
                query2time_different.push(t1 - t0)
                console.log("query2 different: %s", t1 - t0)
            }
        }
    }

    let dict = {
        chunkinsertiontime: chunkinsertiontime,
        pdfinsertiontime: pdfinsertiontime,
        chunkorder: chunkorder,
        filesizes: filesizes,
        query1time_same: query1time_same,
        query1time_different: query1time_different,
        query2time_different: query2time_different,
        query2time_same: query2time_same,
        outputsizes: outputsizes,
    }

    let data = JSON.stringify(dict)

    fs.writeFileSync("benchmark2.json", data)

    const used = process.memoryUsage().heapUsed / 1024 / 1024
    console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`)
}

// main
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
