// this does the same thing as test/test-short, but with some print statements
// also outputs the PDF that is queried as 'deploy2_output.pdf'
// useful for debugging

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

    const folder = 1
    let datafolder = path.join("./Training_Data", folder.toString())
    let metadata = JSON.parse(fs.readFileSync(path.join(datafolder, "10000000001", "meta.json")))

    let t0 = performance.now()
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
    let t1 = performance.now()
    console.log("insertion took " + (t1 - t0) + " ms")

    console.time("getmetadata")
    certMetadata = await pdfStorage.returnCertificateMetadata(["*", "*", "Alexander Jimenez"], true)
    console.timeEnd("getmetadata")
    const decoded = await pdfStorage.decode(certMetadata)
    console.log(decoded)

    console.time("getpdf")
    pdfData = await pdfStorage.getCertificatePDF(["*", "Biomedical Informatics Research", "Alexander Jimenez", "*", "*", "*", "*"], false)
    console.log(pdfData.length)
    console.timeEnd("getpdf")
    pdfData = pdfData.substring(2)
    var output = Buffer.from(pdfData, "hex")
    console.log(output)
    fs.writeFileSync("deploy2_output.pdf", output, "binary")

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
