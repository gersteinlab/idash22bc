// SPDX-License-Identifier: BSD 3-Clause License
pragma experimental ABIEncoderV2;
pragma solidity >=0.8.4;

/**
 * 09/14/2022
 * ERIC NI
 * YALE UNIVERSITY
 * IDASH 2022 TRACK 1 SUBMISSION
 */

contract pdfStorageAndRetrieval {
    // Storage variables
    bytes32 constant WILDCARD = keccak256(abi.encodePacked("*"));
    bytes constant NOMATCH = bytes("No certificates matched that query.\n");
    bytes constant TAB = abi.encodePacked("\t");
    bytes constant NEWLINE = abi.encodePacked("\n");
    uint32 constant MAXDATASIZE = 24000;

    uint256 mCounter = 1; // metadataStorageIndex

    // Structs

    struct Datesf {
        uint32 completionDate;
        uint32 expireDate;
        uint32 uploadDate;
        string filename;
    }

    struct helperArgs {
        uint32 completionDate;
        uint32 expireDate;
        uint32 uploadDate;
        bool cDateWildcard;
        bool eDateWildcard;
        bool uDateWildcard;
    }

    // Mappings

    // metadataStorageIndex => metadata
    mapping(uint256 => address) metadataStorage;
    // metadataStorageIndex => Datesf
    mapping(uint256 => Datesf) datesMap;
    // metadataHash => metadataStorageIndex
    mapping(bytes32 => uint256) metaDataIndex;
    // certificationType => courseName => userName => metadataStorageIndex[]
    mapping(string => mapping(string => mapping(string => uint256[]))) queryMap;
    // metadataStorageIndex => chunknumber => chunkAddressIndex
    mapping(uint256 => mapping(uint256 => mapping(uint256 => address))) chunkMap;

    // CORE FUNCTIONS

    /**
     * name insertCertificateChunk
     * description Function used to upload a chunk of a certificate PDF via a byte array.
     * param {string[] calldata} _metaData = [ certificationType, courseName, userName, completionDate, expirationDate, chunkFileName, uploadDate, pdfFileSize ]
     * example _metaData: [ “DBMI”, “Biomedical Informatics Responsible Conduct of Research”, “Jane Doe”, “09/21/2021”, “09/21/2024”, “10000000047.pdf.chunk1”, “09/24/2021”, “150103” ]
     * param {bytes calldata} _data
     */
    function insertCertificateChunk(string[] calldata _metaData, bytes calldata _data) external {
        string memory filename;
        uint256 chunknum;
        uint256 ii;

        (chunknum, ii) = getChunkNumbers(_metaData[5]);
        filename = _metaData[5][:ii];

        string[] memory metaData = _metaData;
        metaData[5] = filename;

        bytes32 hashedinput = keccak256(abi.encode(metaData));
        uint256 mIndex = metaDataIndex[hashedinput];

        if (mIndex == 0) {
            metaDataIndex[hashedinput] = mCounter;
            mIndex = mCounter;
            for (uint256 i = 0; i < 2; i++) {
                for (uint256 j = 0; j < 2; j++) {
                    for (uint256 k = 0; k < 2; k++) {
                        if (i == 0 || j == 0 || k == 0) {
                            queryMap[i == 0 ? _metaData[0] : "*"][j == 0 ? _metaData[1] : "*"][k == 0 ? _metaData[2] : "*"].push(mCounter);
                        }
                    }
                }
            }

            bytes memory mdatab = metaDatatoBytes(metaData);
            // adapted from https://github.com/0xsequence/sstore2/blob/master/contracts/SSTORE2.sol
            bytes memory mcode = abi.encodePacked(hex"63", uint32(mdatab.length) + 1, hex"80_60_0E_60_00_39_60_00_F3_00", mdatab);
            address mpointer;
            assembly {
                mpointer := create(0, add(mcode, 32), mload(mcode))
            }
            metadataStorage[mCounter] = mpointer;

            datesMap[mCounter].expireDate = stringToDate(_metaData[4]);
            datesMap[mCounter].completionDate = stringToDate(_metaData[3]);
            datesMap[mCounter].uploadDate = stringToDate(_metaData[6]);
            datesMap[mCounter].filename = filename;
            mCounter++;
        }

        // adapted from https://github.com/0xsequence/sstore2/blob/master/contracts/SSTORE2.sol
        address pointer;
        bytes memory code;
        // this is ugly, but faster than calling a function (keep _data in calldata)
        if (_data.length < MAXDATASIZE) {
            code = abi.encodePacked(hex"63", uint32(_data.length) + 1, hex"80_60_0E_60_00_39_60_00_F3_00", _data);

            assembly {
                pointer := create(0, add(code, 32), mload(code))
            }
            chunkMap[mIndex][chunknum][0] = pointer;
        } else {
            // if input chunk data is more than MAXDATASIZE, we need to split it up before adding
            uint256 i;
            while (i < _data.length / MAXDATASIZE) {
                code = abi.encodePacked(hex"63", uint32(MAXDATASIZE + 1), hex"80_60_0E_60_00_39_60_00_F3_00", _data[i * MAXDATASIZE:(i + 1) * MAXDATASIZE]);

                assembly {
                    pointer := create(0, add(code, 32), mload(code))
                }
                chunkMap[mIndex][chunknum][i] = pointer;
                i++;
            }
            code = abi.encodePacked(hex"63", uint32(_data.length - i * MAXDATASIZE + 1), hex"80_60_0E_60_00_39_60_00_F3_00", _data[i * MAXDATASIZE:]);
            assembly {
                pointer := create(0, add(code, 32), mload(code))
            }
            chunkMap[mIndex][chunknum][i] = pointer;
        }
    }

    /**
     * name: returnCertificateMetadata
     * description: This querying function returns the byte array of a TSV string that contains metadata for applicable on-chain PDFs given the requirements.
     * param: {string[] calldata} requirements = [ certificationType, courseName, userName ]
     * The wildcard “*” is a valid input for a metadata parameter, which stands for all possible inputs for this function. For example, requirements = ["DBMI", "*", "Jane Doe"]
     * We may have cases with up to two of the requirements being "*".
     * param: {boolean} notExpired. If true, only return metadata for non-expired PDFs. Otherwise, return metadata of all applicable PDFs regardless of expiration status.
     *
     * returns: {bytes memory} applicable pdf metadata as TSV byte array.
     * return format: "{certificationType}\t{courseName}\t{userName}\t{completionDate}\t{expirationDate}\t{fileName}\t{uploadDate}\t{pdfFileSize}\n"
     * Return example when converted into a string:
     * "DBMI\tBiomedical Informatics Responsible Conduct of Research\tJane Doe\t09/21/2021\t 09/21/2024\t10000000047.pdf\t09/24/2021\t150103\nDBMI\tBiomedical Informatics Research\tJane Doe\t10/01/2020\t10/01/2023\t30000000013.pdf\t10/29/2020\t709207\n"
     * If no on-chain pdf matches the requirements, return the byte array equivalence of "No certificates matched that query.\n".
     * Notice the "\t" characters between the intra-pdf metadata, and the "\n" between the inter-pdf metadata (and after the failed search message).
     */
    function returnCertificateMetadata(string[] calldata _requirements, bool _notExpired) external view returns (bytes memory) {
        uint256[] memory hits = queryMap[_requirements[0]][_requirements[1]][_requirements[2]];
        uint256 h = hits.length;
        if (h == 0) {
            return NOMATCH;
        }
        if (_notExpired) {
            hits = removeExpired(hits, h);
        }
        uint256 totalSize;
        for (uint256 i = 0; i < h; i++) {
            if (hits[i] != 0) {
                totalSize += codeSize(metadataStorage[hits[i]]) - 1;
            }
        }

        bytes memory result;
        uint256 currAddr;
        address pointer;
        assembly {
            result := mload(0x40)
            mstore(0x40, add(result, and(add(add(totalSize, 0x20), 0x1f), not(0x1f))))
            mstore(result, totalSize)
            currAddr := add(result, 32)
        }
        uint256 chunksize;

        for (uint256 i = 0; i < h; i++) {
            if (hits[i] != 0) {
                pointer = metadataStorage[hits[i]];
                currAddr += chunksize;
                chunksize = codeSize(metadataStorage[hits[i]]) - 1;

                assembly {
                    extcodecopy(pointer, currAddr, 1, chunksize)
                }
            }
        }

        if (result.length == 0) {
            return NOMATCH;
        }

        return result;
    }

    /**
    * name: getCertificatePDF
    * description: Returns the most recent on-chain PDF that fulfills the requirements.
    * param: {string[] calldata} requirements = [ certificationType, courseName, userName, completionDate, expirationDate, fileName, uploadDate ]
    * The wildcard “*” is a valid input for a metadata parameter, which stands for all possible inputs for this function.
    * Note that “*” is a valid input for any metadata parameter for this function, except for courseName and userName.
    * param: {boolean} _notExpired. If true, only return the latest non-expired PDF based on completion date. Otherwise, return the latest PDF based on completion date regardless of expiration status.
    *
    * returns: {bytes memory} full PDF data as a byte array (i.e., chunk_1_data || chunk_2_data || … || chunk_n_data); in this context, “||” means concatenation.

    * If no on-chain PDF matches the requirements, return the byte array equivalence of "No certificates matched that query.\n".
    */
    function getCertificatePDF(string[] calldata _requirements, bool _notExpired) external view returns (bytes memory) {
        uint256[] memory hits = queryMap[_requirements[0]][_requirements[1]][_requirements[2]];
        if (hits.length == 0) {
            return NOMATCH;
        }
        uint256 tophit = findLatestValidHit(hits, _requirements, _notExpired);

        if (tophit == 0) {
            return NOMATCH;
        } else {
            uint256 totalsize;
            uint256 i = 1;
            uint256 j;
            while (chunkMap[tophit][i][j] != address(0)) {
                while (chunkMap[tophit][i][j] != address(0)) {
                    totalsize += codeSize(chunkMap[tophit][i][j]) - 1;
                    j++;
                }
                i++;
                j = 0;
            }
            uint256 totalchunks = i;

            bytes memory result;

            uint256 chunksize;
            uint256 currAddr;
            address pointer;

            assembly {
                // Note: this is NOT "memory safe", but I don't think this can be abused..
                result := 2560

                // uncomment these 2 lines for the memory safe version (its slower):
                // result := mload(0x40)
                // mstore(0x40, add(result, and(add(add(totalsize, 0x20), 0x1f), not(0x1f))))
                mstore(result, totalsize)
                currAddr := add(result, 32)
            }

            i = 1;
            while (i < totalchunks) {
                j = 0;
                while (chunkMap[tophit][i][j] != address(0)) {
                    pointer = chunkMap[tophit][i][j];
                    currAddr += chunksize;
                    chunksize = codeSize(pointer) - 1;

                    assembly {
                        extcodecopy(pointer, currAddr, 1, chunksize)
                    }
                    j++;
                }
                i++;
            }
            return result;
        }
    }

    // HELPER FUNCTIONS

    // decodes bytes to string
    function decode(bytes calldata m) external pure returns (string memory) {
        return string(m);
    }

    /**
     * get chunk number and index of last character for filename from chunkfilename
     * example: "10000000001.pdf.chunk8" becomes (8, 14)
     *  */
    function getChunkNumbers(string memory s) internal pure returns (uint256, uint256) {
        bytes memory b = bytes(s);
        uint256 cnum = 0;
        uint256 i = b.length - 1;
        uint256 j = 1;
        while (uint8(b[i]) >= 48 && uint8(b[i]) <= 57) {
            cnum = cnum + (uint8(b[i]) - 48) * j;
            j = j * 10;
            i--;
        }

        return (cnum, i - 5);
    }

    // converts metadata to format for returnCertificateMetadata output (TSV)
    function metaDatatoBytes(string[] memory m) internal pure returns (bytes memory) {
        bytes memory result;
        result = abi.encodePacked(m[0], TAB, m[1], TAB, m[2], TAB, m[3], TAB);
        result = abi.encodePacked(result, m[4], TAB, m[5], TAB, m[6], TAB, m[7], NEWLINE);
        return result;
    }

    // given an initial list of hitIDs, remove the expired IDs by setting them to 0
    function removeExpired(uint256[] memory hits, uint256 h) internal view returns (uint256[] memory) {
        uint256 currentTime = block.timestamp;
        for (uint256 i = 0; i < h; i++) {
            if ((datesMap[hits[i]].expireDate < currentTime)) {
                hits[i] = 0;
            }
        }
        return hits;
    }

    // given an initial list of hitIDs, find the ID for the PDF that matches with latest completion date
    function findLatestValidHit(
        uint256[] memory hits,
        string[] memory _requirements,
        bool _notExpired
    ) internal view returns (uint256) {
        bytes32 _filename;

        helperArgs memory hargs;
        (_filename, hargs) = createHelperArgs(_requirements);

        uint256 latestcDate = 0;
        uint32 currentTime = uint32(block.timestamp);
        bool filenameWildcard = _filename == WILDCARD;
        uint256 result;

        // not efficient if hits.length is large, but we assume it isnt
        for (uint256 i = 0; i < hits.length; i++) {
            Datesf memory mdate = datesMap[hits[i]];

            // if hit is valid
            if (
                (!_notExpired || (mdate.expireDate > currentTime)) &&
                (hargs.cDateWildcard || mdate.completionDate >= hargs.completionDate) &&
                (hargs.eDateWildcard || mdate.expireDate >= hargs.expireDate) &&
                (hargs.uDateWildcard || mdate.uploadDate >= hargs.uploadDate) &&
                (filenameWildcard || keccak256(abi.encodePacked(mdate.filename)) == _filename)
            ) {
                if (mdate.completionDate > latestcDate) {
                    latestcDate = mdate.completionDate;
                    result = hits[i];
                }
            }
        }
        return result;
    }

    // this helper function is needed to prevent the stack from overflowing
    function createHelperArgs(string[] memory _requirements) internal pure returns (bytes32, helperArgs memory) {
        bytes32 _filename = keccak256(abi.encodePacked(_requirements[5]));

        bool cDateWildcard = keccak256(abi.encodePacked(_requirements[3])) == WILDCARD;
        bool eDateWildcard = keccak256(abi.encodePacked(_requirements[4])) == WILDCARD;
        bool uDateWildcard = keccak256(abi.encodePacked(_requirements[6])) == WILDCARD;

        uint32 _completionDate = cDateWildcard ? 0 : stringToDate(_requirements[3]);
        uint32 _expirationDate = eDateWildcard ? 0 : stringToDate(_requirements[4]);
        uint32 _uploadDate = uDateWildcard ? 0 : stringToDate(_requirements[6]);

        helperArgs memory hargs = helperArgs(_completionDate, _expirationDate, _uploadDate, cDateWildcard, eDateWildcard, uDateWildcard);

        return (_filename, hargs);
    }

    /* convert date from string to uint32, in unix time seconds
    input date string must in format 'mm/dd/yyyy'
    ALL DATES MUST BE IN RANGE 01/01/1970 to 02/07/2106 
    */
    function stringToDate(string memory s) public pure returns (uint32) {
        bytes memory b = bytes(s);
        uint256 m = (uint8(b[0]) - 48) * 10 + (uint8(b[1]) - 48);
        uint256 d = (uint8(b[3]) - 48) * 10 + (uint8(b[4]) - 48);
        uint256 x = (uint8(b[7]) - 48);
        x *= 100; // no idea why this needs to be separated
        uint256 y = (uint8(b[6]) - 48) * 1000 + x + (uint8(b[8]) - 48) * 10 + (uint8(b[9]) - 48);
        if (y < 1970) {
            return 0;
        }
        if (y > 2105) {
            return type(uint32).max;
        }

        // algorithm adapted from http://howardhinnant.github.io/date_algorithms.html
        y -= (m <= 2 ? 1 : 0);
        uint256 era = (y >= 0 ? y : y - 399) / 400;
        uint256 yoe = y - era * 400;
        uint256 doy = (153 * (m > 2 ? m - 3 : m + 9) + 2) / 5 + d - 1;
        uint256 doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
        uint256 dfc = era * 146097 + doe - 719468;
        return uint32(dfc * 86400);
    }

    function codeSize(address _addr) internal view returns (uint256 size) {
        assembly {
            size := extcodesize(_addr)
        }
    }
}
