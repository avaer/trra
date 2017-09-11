const mod = require('mod-loop');

const CHUNK_HEADER_SIZE = 2 * 4;
const CHUNK_BUFFER_SIZE = 1 * 1024 * 1024;
const CHUNK_SIZE = CHUNK_HEADER_SIZE + CHUNK_BUFFER_SIZE;

const _getChunkIndex = (x, z) => mod(x, 65536) | mod(z, 65536) << 16;

class Chunk {
  constructor(x = 0, z = 0, buffer = new Uint32Array(CHUNK_BUFFER_SIZE / 4)) {
    this.x = x;
    this.z = z;
    this.uint32Buffer = buffer;

    this.dirty = false;
  }

  getBuffer() {
    return this.uint32Buffer;
  }

  generate(generator, opts) {
    generator(this.x, this.z, this.uint32Buffer.buffer, this.uint32Buffer.byteOffset, opts);
    this.dirty = true;
  }
}

class Trra {
  constructor() {
    this.chunks = {};
  }

  load(buffer) {
    const numChunks = buffer.length / CHUNK_SIZE;
    let {byteOffset} = buffer;
    for (let i = 0; i < numChunks; i ++) {
      const chunkHeader = new Int32Array(buffer.buffer, byteOffset, 2);
      const x = chunkHeader[0];
      const z = chunkHeader[1];
      byteOffset += 2 * 4;
      const chunkBuffer = new Uint32Array(buffer.buffer, byteOffset, CHUNK_BUFFER_SIZE / 4);
      byteOffset += CHUNK_BUFFER_SIZE;

      this.chunks[_getChunkIndex(x, z)] = new Chunk(x, z, chunkBuffer);
    }
  }

  save(fn) {
    let byteOffset = 0;

    for (const index in this.chunks) {
      const chunk = this.chunks[index];

      if (chunk) {
        if (chunk.dirty) {
          fn(byteOffset, Int32Array.from([chunk.x, chunk.z]));
          byteOffset += CHUNK_HEADER_SIZE;
          fn(byteOffset, chunk.uint32Buffer);
          byteOffset += CHUNK_BUFFER_SIZE;

          chunk.dirty = false;
        } else {
          byteOffset += CHUNK_SIZE;
        }
      }
    }
  }

  getChunk(x, z) {
    return this.chunks[_getChunkIndex(x, z)];
  }

  addChunk(x, z, buffer) {
    const chunk = new Chunk(x, z, buffer);
    this.chunks[_getChunkIndex(x, z)] = chunk;
    return chunk;
  }

  removeChunk(x, z) {
    const index = _getChunkIndex(x, z);
    const oldChunk = this.chunks[index];
    this.chunks[index] = null;
    return oldChunk;
  }

  makeChunk(x, z) {
    const chunk = new Chunk(x, z);
    this.chunks[_getChunkIndex(x, z)] = chunk;
    return chunk;
  }
}

const trra = () => new Trra();
trra.CHUNK_BUFFER_SIZE = CHUNK_BUFFER_SIZE;

module.exports = trra;
