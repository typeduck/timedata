'use strict'

const Payloads = require('./Payloads')
const Chunk = require('./Chunk')
const Reasons = require('./Reasons')

module.exports = TimeData

function TimeData (date) {
  this.chunks = []
  this.properties = {}
  if (date) { this.setProperty('Timestamp', date) }
}
TimeData.prototype.setProperty = function (k, v) { this.properties[k] = v }
TimeData.prototype.getProperty = function (k) { return this.properties[k] }
// Simple getter/setter properties
Payloads.getTypes().forEach(function (payloadType) {
  let pname = payloadType.name
  let setter = 'set' + pname
  let getter = 'get' + pname
  if (!TimeData.prototype[setter]) {
    TimeData.prototype[setter] = function (v) { this.properties[pname] = v }
  }
  if (!TimeData.prototype[getter]) {
    TimeData.prototype[getter] = function (v) { return this.properties[pname] }
  }
})
TimeData.prototype.addChunk = function (chunk) {
  if (!(chunk instanceof Chunk)) {
    throw new Error('TimeData.addChunk() requires Chunk instance')
  }
  this.chunks.push(chunk)
}
TimeData.prototype.toBuffer = function () {
  if (!this.properties.Timestamp) {
    throw new Error('TimeData.toBuffer() requires setting Timestamp property!')
  }
  const chunks = this.chunks.slice()
  let dateBuffer = Payloads.Timestamp.encode(this.properties.Timestamp)
  let dateChunk = new Chunk(Payloads.Timestamp.type, dateBuffer)
  chunks.unshift(dateChunk)
  for (let prop in this.properties) {
    if (prop === 'Timestamp') { continue }
    const val = this.properties[prop]
    const payloadType = Payloads[prop]
    const iType = payloadType && payloadType.type
    const encode = Payloads[prop] && Payloads[prop].encode
    if (!encode) {
      throw new Error(`Payloads.${prop}.encode() does not exist`)
    }
    const payload = encode(val)
    chunks.push(new Chunk(iType, payload))
  }
  let totalSize = 0
  for (let chunk of chunks) { totalSize += chunk.size() }
  const buffer = Buffer.alloc(totalSize)
  let offset = 0
  for (let chunk of chunks) {
    offset = chunk.writeTo(buffer, offset)
  }
  return buffer
}

// Static method to read data from a buffer
TimeData.read = function (buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('TimeData.read() requires Buffer')
  }
  const chunks = []
  while (buffer.length) {
    buffer = Chunk.readOnto(buffer, chunks)
  }
  const allData = []
  let timeData
  while (chunks.length) {
    const chunk = chunks.shift()
    const pType = Payloads.getType(chunk.type)
    const parseFunction = pType && pType.decode
    if (!parseFunction) {
      if (timeData) { timeData.addChunk(chunk) }
      continue
    }
    const value = parseFunction(chunk.payload)
    if (pType === Payloads.Timestamp) {
      allData.push(timeData = new TimeData(value))
    } else if (timeData['set' + pType.name]) {
      timeData['set' + pType.name](value)
    } else {
      timeData.addChunk(chunk)
    }
  }
  return allData
}

TimeData.DOP = { HDOP: 0, PDOP: 1 }
TimeData.Voltage = { Battery: 0, Supply: 1 }
TimeData.Reasons = Reasons
