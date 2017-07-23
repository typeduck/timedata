'use strict'

const Payloads = require('./Payloads')
const Chunk = require('./Chunk')

module.exports = TimeData

function TimeData (date) {
  this.unknownChunks = []
  this.properties = {}
  this.voltages = {}
  this.dops = {}
  this.dins = {}
  if (date) { this.setProperty('Timestamp', date) }
}
TimeData.prototype.setProperty = function (k, v) { this.properties[k] = v }
TimeData.prototype.getProperty = function (k) { return this.properties[k] }
// Specialized / combined getter/setters
TimeData.prototype.setVoltage = function (v) {
  if (!Array.isArray(v) || v.length < 2) {
    throw new Error(`Incorrect Voltage value ${v}`)
  }
  this.voltages[v[0]] = v[1]
}
TimeData.prototype.getVoltage = function (subtype) {
  return this.voltages && this.voltages[subtype]
}
TimeData.prototype.setDOP = function (v) {
  if (!Array.isArray(v) || v.length < 2) {
    throw new Error(`Incorrect DOP value ${v}`)
  }
  this.dops[v[0]] = v[1]
}
TimeData.prototype.getDOP = function (subtype) {
  return this.dops && this.dops[subtype]
}
TimeData.prototype.setDINStatus = function (v) {
  if (Array.isArray(v) && v.length === 2) {
    this.dins[v[0]] = v[1]
  } else if (typeof v === 'object' && v != null) {
    for (let ix in v) {
      let dinIx = parseInt(ix, 10)
      if (!isNaN(dinIx)) { this.dins[dinIx] = !!v[ix] }
    }
  } else {
    throw new Error(`Incorrect DINStatus value ${v}`)
  }
}
TimeData.prototype.getDINStatus = function (idx) {
  return this.dins[idx]
}

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
  this.unknownChunks.push(chunk)
}
TimeData.prototype.toBuffer = function () {
  if (!this.properties.Timestamp) {
    throw new Error('TimeData.toBuffer() requires setting Timestamp property!')
  }
  // First chunk is always the date
  let dateBuffer = Payloads.Timestamp.encode(this.properties.Timestamp)
  let dateChunk = new Chunk(Payloads.Timestamp.type, dateBuffer)
  const chunks = [dateChunk].concat(this.getKnownChunks()).concat(this.unknownChunks)
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
TimeData.prototype.getKnownChunks = function () {
  const dic = this.getDINChunks()
  const vc = this.getVoltageChunks()
  const dc = this.getDOPChunks()
  return dic.concat(vc).concat(dc)
}
TimeData.prototype.getVoltageChunks = function () {
  return Object.keys(this.voltages).map((k) => {
    const buffer = Payloads.Voltage.encode([Number(k), this.voltages[k]])
    return new Chunk(Payloads.Voltage.type, buffer)
  })
}
TimeData.prototype.getDOPChunks = function () {
  return Object.keys(this.dops).map((k) => {
    const buffer = Payloads.DOP.encode([Number(k), this.dops[k]])
    return new Chunk(Payloads.DOP.type, buffer)
  })
}
TimeData.prototype.getDINChunks = function () {
  if (Object.keys(this.dins).length === 0) { return [] }
  const typeId = Payloads.DINStatus.type
  const payload = Payloads.DINStatus.encode(this.dins)
  return [new Chunk(typeId, payload)]
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
    const value = parseFunction(chunk.payload, timeData)
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
TimeData.Voltage = Payloads.Subtypes.Voltage
TimeData.Reasons = Payloads.Subtypes.Reasons
