// this benchmark inserts 1 PDFs, and retrieves the PDF after each chunk (58 chunks)
// tracks query 2 time, and output file size

const { ethers } = require("hardhat")
const fs = require("fs")
const path = require("path")

async function main() {
    //
    console.log("Deploying...")
    const pdfFactory = await ethers.getContractFactory("pdfStorageAndRetrieval")
    const pdfStorage = await pdfFactory.deploy()
    await pdfStorage.deployed()
    console.log("Contract deployed")

    var insertiontime = []
    var query2time = []
    var pdffilesize = []

    const folder = 1
    let datafolder = path.join("./Training_Data", folder.toString())
    let metadata = JSON.parse(fs.readFileSync(path.join(datafolder, "10000000001", "meta.json")))

    for (var j = 1; j < 60; j++) {
        for (const i in metadata) {
            chunkdata = fs.readFileSync(path.join(datafolder, "10000000001", "chunks", metadata[i]["chunk_file_name"]))
            if (i < j) {
                let t0 = performance.now()
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
                let t1 = performance.now()
                insertiontime.push(t1 - t0)
            }
        }

        let t0 = performance.now()
        pdfData = await pdfStorage.getCertificatePDF(["*", "Biomedical Informatics Research", "Alexander Jimenez", "*", "*", "*", "*"], false)
        let t1 = performance.now()
        query2time.push(t1 - t0)
        pdffilesize.push(pdfData.length)
        console.log(pdfData.length)
    }

    let dict = {
        query2time: query2time,
        pdffilesize: pdffilesize,
    }

    let data = JSON.stringify(dict)

    fs.writeFileSync("benchmark3.json", data)

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
