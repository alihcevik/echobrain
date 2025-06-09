
export function convertToLittleEndian(int16Array) {
    const buffer = new ArrayBuffer(int16Array.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < int16Array.length; i++) {
        view.setInt16(i * 2, int16Array[i], true);
    }

    return buffer;
}

export function convertPCMToFloat32(pcmBuffer) {
    const dataView = new DataView(pcmBuffer);
    const float32Array = new Float32Array(pcmBuffer.byteLength / 2);

    for (let i = 0; i < float32Array.length; i++) {
        float32Array[i] = dataView.getInt16(i * 2, true) / 32768.0; // Little-endian
    }

    return float32Array;
}

export function base64ToArrayBuffer(base64) {
    var binaryString = atob(base64);
    var bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

export function arrayBufferToBase64(buffer) {
    var binary = "";
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }