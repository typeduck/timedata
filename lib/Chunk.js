'use strict'

module.exports = Chunk

function Chunk (type, payload) {
  this.type = type
  if (!Buffer.isBuffer(payload)) {
    throw new Error(`Non-buffer payload in Chunk.type=${type}, ${payload}`)
  }
  this.payload = payload
}
Chunk.prototype.size = function () {
  return 1 + this.getExtraTypeSize() + this.getExtraLengthSize() + this.payload.length
}
Chunk.prototype.getExtraTypeSize = function () {
  return Math.ceil((this.type - 14) / 255)
}
Chunk.prototype.getExtraLengthSize = function () {
  return Math.ceil((this.payload.length - 14) / 255)
}
Chunk.prototype.writeTo = function (buffer, offset) {
  buffer[offset++] = this.headerByte()
  let type = this.type - 0xF
  while (type >= 0) {
    buffer[offset++] = Math.min(type, 0xFF)
    type -= 0xFF
  }
  let len = this.payload.length - 0xF
  while (len >= 0) {
    buffer[offset++] = Math.min(len, 0xFF)
    len -= 0xFF
  }
  this.payload.copy(buffer, offset)
  return offset + this.payload.length
}
Chunk.prototype.headerByte = function () {
  return Math.min(this.type, 0xF) << 4 | Math.min(this.payload.length, 0xF)
}

Chunk.readFrom = function (buffer, pointer) {
  const headerByte = buffer[pointer.offset++]
  let type = headerByte >> 4
  let keepGoing = 0xF
  while (type === keepGoing) {
    type += buffer[pointer.offset++]
    keepGoing += 0xFF
  }
  let len = headerByte & 0xF
  keepGoing = 0xF
  while (len === keepGoing) {
    len += buffer[pointer.offset++]
    keepGoing += 0xFF
  }
  const payload = buffer.slice(pointer.offset, pointer.offset + len)
  pointer.offset += len
  return new Chunk(type, payload)
}
