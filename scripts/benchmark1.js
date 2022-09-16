// this benchmark inserts 1000 PDFs, 250 each from 4 different addresses, then does query 1 and 2 once
// tracks insertion time per chunk
const { ethers } = require("hardhat")
const fs = require("fs")
const path = require("path")
async function main() {
    //
    console.log("Deploying...")
    const pdfFactory = await ethers.getContractFactory("pdfStorageAndRetrieval")
    const pdfStorage = await pdfFactory.deploy()
    await pdfStorage.deployed()
    const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners()
    console.log("Contract deployed")
    var t0, t1
    var insertiontime = []

    console.time("insertion")

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
                    insertiontime.push(t1 - t0)
                }
            }
        }
    }

    console.timeEnd("insertion")

    let dict = {
        insertiontime: insertiontime,
    }

    let data = JSON.stringify(dict)

    fs.writeFileSync("benchmark1.json", data)
    console.time("getmetadata")
    certMetadata = await pdfStorage.returnCertificateMetadata(["DBMI", "*", "*"], true)
    console.timeEnd("getmetadata")
    const decoded = await pdfStorage.decode(certMetadata)
    console.log(decoded)

    console.time("getpdf")
    //pdfData = await pdfStorage.getCertificatePDF(["*", "Biomedical Data Only Research", "*", "*", "*", "*", "*"], false)
    pdfData = await pdfStorage.getCertificatePDF(["*", "Biomedical Informatics Research", "Alexander Jimenez", "*", "*", "*", "*"], false)
    console.log(pdfData.length)
    console.timeEnd("getpdf")
    pdfData = pdfData.substring(2)
    var output = Buffer.from(pdfData, "hex")
    console.log(output)
    fs.writeFileSync("benchmark1_output.pdf", output, "binary")

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
