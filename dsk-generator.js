/**
 * DSK Generator Engine para Amstrad CPC
 * Genera el cargador BASIC con la línea de INKs dinámica basada en el editor.
 */

function createAmsdosHeader(filename, extension, type, length, loadAddr, execAddr) {
    let header = new Uint8Array(128);
    header.fill(0);
    header[0] = 0; 
    for (let i = 0; i < 8; i++) header[1 + i] = i < filename.length ? filename.charCodeAt(i) : 0x20;
    for (let i = 0; i < 3; i++) header[9 + i] = i < extension.length ? extension.charCodeAt(i) : 0x20;
    header[18] = type; 
    header[24] = length & 0xFF;
    header[25] = (length >> 8) & 0xFF;
    header[21] = loadAddr & 0xFF;
    header[22] = (loadAddr >> 8) & 0xFF;
    header[26] = execAddr & 0xFF;
    header[27] = (execAddr >> 8) & 0xFF;
    header[64] = length & 0xFF;
    header[65] = (length >> 8) & 0xFF;
    header[66] = (length >> 16) & 0xFF;
    let checksum = 0;
    for (let i = 0; i <= 66; i++) checksum += header[i];
    header[67] = checksum & 0xFF;
    header[68] = (checksum >> 8) & 0xFF;
    return header;
}

function writeDirEntry(buffer, offset, filename, ext, extent, records, blocks) {
    for (let i = 0; i < 32; i++) buffer[offset + i] = 0x00; 
    buffer[offset + 0] = 0; 
    for (let i = 0; i < 8; i++) buffer[offset + 1 + i] = filename.charCodeAt(i);
    for (let i = 0; i < 3; i++) buffer[offset + 9 + i] = ext.charCodeAt(i);
    buffer[offset + 12] = extent;
    buffer[offset + 15] = records;
    for (let i = 0; i < blocks.length; i++) buffer[offset + 16 + i] = blocks[i];
}

function generateCPCDisk(screenData, mode, animate, fw, fh, nf, animSpeed) {
    const TRACKS = 40;
    const SECTORS = 9;
    const TRACK_DATA_SIZE = 4864; 
    const buffer = new Uint8Array(256 + (TRACKS * TRACK_DATA_SIZE));
    buffer.fill(0xE5); 

    const sig = "MV - CPCEMU Disk-File\r\nDisk-Info\r\n";
    for (let i = 0; i < sig.length; i++) buffer[i] = sig.charCodeAt(i);
    buffer[0x30] = TRACKS; buffer[0x31] = 1; buffer[0x32] = 0x00; buffer[0x33] = 0x13;

    for (let t = 0; t < TRACKS; t++) {
        let offset = 256 + (t * TRACK_DATA_SIZE);
        const trkSig = "Track-Info\r\n";
        for (let i = 0; i < trkSig.length; i++) buffer[offset + i] = trkSig.charCodeAt(i);
        buffer[offset + 0x10] = t; buffer[offset + 0x11] = 0;
        buffer[offset + 0x14] = 2; buffer[offset + 0x15] = SECTORS;
        buffer[offset + 0x16] = 0x4E; buffer[offset + 0x17] = 0xE5;
        for (let s = 0; s < SECTORS; s++) {
            let sOff = offset + 0x18 + (s * 8);
            buffer[sOff + 0] = t; buffer[sOff + 1] = 0;
            buffer[sOff + 2] = 0xC1 + s; buffer[sOff + 3] = 2; 
            buffer[sOff + 4] = 0; buffer[sOff + 5] = 0; buffer[sOff + 6] = 0; buffer[sOff + 7] = 0x02;
        }
    }

    const ppb = (mode == 0 ? 2 : (mode == 1 ? 4 : 8));
    const wBytes = Math.ceil(fw / ppb);

    const palette = fModes[mode];
    const inkLine = "30 " + palette.map((hw, idx) => `INK ${idx},${hw}`).join(":");
    
    let loader = "";
    if (!animate) {
        loader = `10 MEMORY &3FFF\r\n20 MODE ${mode}\r\n${inkLine}\r\n40 LOAD "SCREEN.BIN",&C000\r\n50 CALL &BB18\r\n60 GOTO 60\r\n\x1A`;
    } else {
        const delay = Math.max(1, Math.floor(animSpeed / 20));
        const safeY = Math.max(0, Math.floor((200 - fh) / 2));
        const maxPx = Math.max(0, 80 - wBytes);
        const dxInit = maxPx > 0 ? 1 : 0;
        loader = `10 MEMORY &3EFF\r\n20 MODE ${mode}\r\n${inkLine}\r\n40 LOAD "SCREEN.BIN",&4000\r\n` +
                 `50 FOR i=0 TO 67: READ a: POKE &3F00+i, a: NEXT i\r\n` +
                 `51 DATA 221,110,8,221,102,9,221,78,6,221,70,0,197,229,120,230\r\n` +
                 `52 DATA 7,7,7,7,246,192,87,30,0,120,203,63,203,63,203\r\n` +
                 `53 DATA 63,111,38,0,41,41,41,41,229,41,41,193,9,25,221\r\n` +
                 `54 DATA 94,2,221,86,3,25,235,225,221,78,4,221,70,5,237,176\r\n` +
                 `55 DATA 193,4,13,32,201,201\r\n` +
                 `56 FOR i=0 TO 26: READ a: POKE &3F50+i, a: NEXT i\r\n` +
                 `57 DATA 221,78,0,221,70,1,120,177,200,221,110,2,221,102,3,91,84,19\r\n` +
                 `58 DATA 54,0,11,120,177,200,237,176,201\r\n` +
                 `60 f=0: w=${wBytes}: h=${fh}: nf=${nf}\r\n` +
                 `65 b=&4000 + (w * h * nf): sz=w*h\r\n` +
                 `66 IF b > 32767 THEN b = b - 65536\r\n` +
                 `67 CALL &3F50, b, sz\r\n` +
                 `70 px=0: py=${safeY}: dx=${dxInit}\r\n80 CLS\r\n90 WHILE 1\r\n` +
                 `100 FOR i=1 TO ${delay}: CALL &BD19: NEXT i\r\n` + 
                 `110 CALL &3F00, b, h, w, px, py\r\n120 px = px + dx\r\n` +
                 `130 IF px < 0 OR px > ${maxPx} THEN dx = -dx: px = px + dx\r\n` +
                 `140 s = &4000 + (f * w * h): IF s > 32767 THEN s = s - 65536\r\n` +
                 `150 CALL &3F00, s, h, w, px, py\r\n` +
                 `160 f = (f + 1) MOD nf\r\n170 WEND\r\n\x1A`;
    }

    const fileBas = new Uint8Array(loader.length);
    for (let i = 0; i < loader.length; i++) fileBas[i] = loader.charCodeAt(i);

    const actualSize = animate ? (wBytes * fh * nf) : 16384; 
    const loadAddr = animate ? 0x4000 : 0xC000;

    const headerBin = createAmsdosHeader("SCREEN  ", "BIN", 2, actualSize, loadAddr, 0x0000);
    
    const fileRecords = Math.ceil((128 + actualSize) / 128);
    const paddedLength = Math.ceil((128 + actualSize) / 1024) * 1024;
    const fileBin = new Uint8Array(paddedLength);
    
    fileBin.fill(0);
    fileBin.set(headerBin, 0); 
    fileBin.set(screenData.subarray(0, Math.min(screenData.length, actualSize)), 128);

    let dirOffset = 512; 
    
    // Calculamos bloques dinámicamente para el BASIC por si supera 1KB (1 bloque = 1024 bytes)
    const basBlocksCount = Math.ceil(fileBas.length / 1024);
    const basBlocks = [];
    for (let i = 0; i < basBlocksCount; i++) basBlocks.push(2 + i);
    writeDirEntry(buffer, dirOffset, "DISCO   ", "BAS", 0, Math.ceil(fileBas.length / 128), basBlocks);
    
    const binStartBlock = 2 + basBlocksCount;
    
    // --- CÓDIGO: SOPORTE MULTI-EXTENT PARA ARCHIVOS DE CUALQUIER TAMAÑO ---
    let remainingRecords = fileRecords;
    let currentBlockIndex = 0;
    let extentNumber = 0;
    
    while (remainingRecords > 0) {
        let recordsInThisExtent = Math.min(remainingRecords, 128);
        let blocksInThisExtent = Math.ceil(recordsInThisExtent / 8); // 8 records por bloque de 1KB
        
        let blocksExt = [];
        for (let i = 0; i < blocksInThisExtent; i++) {
            blocksExt.push(binStartBlock + currentBlockIndex);
            currentBlockIndex++;
        }
        
        writeDirEntry(buffer, dirOffset + 32 + (extentNumber * 32), "SCREEN  ", "BIN", extentNumber, recordsInThisExtent, blocksExt);
        
        remainingRecords -= recordsInThisExtent;
        extentNumber++;
    }
    // ----------------------------------------------------------------------------

    function writeData(startBlock, dataArray) {
        for (let i = 0; i < dataArray.length; i++) {
            let logicalBlock = startBlock + Math.floor(i / 1024);
            let offsetInBlock = i % 1024;
            let logicalSector = (logicalBlock * 2) + Math.floor(offsetInBlock / 512);
            let track = Math.floor(logicalSector / 9);
            let sectorInTrack = logicalSector % 9;
            let offsetInSector = offsetInBlock % 512;
            let physicalOffset = 256 + (track * TRACK_DATA_SIZE) + 256 + (sectorInTrack * 512) + offsetInSector;
            if (physicalOffset < buffer.length) buffer[physicalOffset] = dataArray[i];
        }
    }

    writeData(2, fileBas);
    writeData(binStartBlock, fileBin);
    return buffer;
}