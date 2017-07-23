'use strict'

const Reasons = require('./Reasons')

exports.Timestamp = { decode: parseDate, encode: encodeDate, type: 0 }
exports.Coordinate = { decode: parseCoordinate, encode: encodeCoordinate, type: 1 }
exports.Speed = { decode: parseUInt, encode: encodeUInt, type: 2 }
exports.Heading = { decode: parseUInt, encode: encodeUInt, type: 3 }
exports.Altitude = { decode: parseSInt, encode: encodeSInt, type: 4 }
exports.DINStatus = { decode: parseBitmap, encode: encodeBitmap, type: 5 }
exports.Distance = { decode: parseUInt, encode: encodeUInt, type: 6 }
exports.Satellites = { decode: parseUInt, encode: encodeUInt, type: 7 }
exports.TransmissionStamp = { decode: parseDate, encode: encodeDate, type: 8 }
exports.DOP = { decode: parseDOP, encode: encodeDOP, type: 9 }
exports.Voltage = { decode: parseVoltage, encode: encodeVoltage, type: 10 }
exports.Temperature = { decode: parseSInt, encode: encodeSInt, type: 12 }
exports.OneWire = { decode: parseHex, encode: encodeHex, type: 13 }
exports.Reason = { decode: parseUInt, encode: encodeReason, type: 14 }
exports.DINIndex = { decode: parseUInt, encode: encodeUInt, type: 15 }
exports.Humidity = { decode: parseUInt, encode: parseUInt, type: 16 }

const reverseTypes = {}
for (let ptype in exports) {
  let payloadType = exports[ptype]
  payloadType.name = ptype
  reverseTypes[payloadType.type] = payloadType
}

const Subtypes = exports.Subtypes = {}
Subtypes.Voltage = { Battery: 0, Supply: 1 }
Subtypes.Reasons = Reasons

exports.getType = (typeCode) => reverseTypes[typeCode]
exports.getTypes = () => {
  return Object.keys(reverseTypes).map((k) => reverseTypes[k])
}

function parseDate (buffer) {
  return new Date(parseUInt(buffer))
}
function encodeDate (date) {
  return encodeUInt(date.getTime())
}

// Coordinates
class BitPacker {
  constructor (bits, max) {
    this.bits = bits
    this.maxValue = max
    this.minValue = -max
    this.maxBitValue = Math.pow(2, bits) - 1
    this.range = 2 * this.maxValue
  }
  pack (val) {
    if (isNaN(val) || val < this.minValue || val > this.maxValue) {
      throw new Error(`Value "${val}" outside magnitude (${this.maxValue})`)
    }
    return Math.round((val + this.maxValue) / this.range * this.maxBitValue)
  }
  unpack (val) {
    if (isNaN(val) || val < 0 || val > this.maxBitValue) {
      throw new Error(`Value "${val}" outside bounds (${this.maxBitValue})`)
    }
    return -this.maxValue + (val / this.maxBitValue * this.range)
  }
}
const packers = new Map()
function getPacker (bytes) {
  let bitLen = bytes * 4
  if (packers.has(bitLen)) { return packers.get(bitLen) }
  let packer = {
    lat: new BitPacker(bitLen, 90),
    lon: new BitPacker(bitLen, 180)
  }
  packers.set(bitLen, packer)
  return packer
}
function parseCoordinate (buffer) {
  const packer = getPacker(buffer.length)
  const vals = splitBuffer(buffer)
  return [ packer.lat.unpack(vals[0]), packer.lon.unpack(vals[1]) ]
}
function encodeCoordinate (latlon) {
  const useBytes = latlon.length > 2 ? latlon[2] : 7
  const packer = getPacker(useBytes)
  const encodedLat = packer.lat.pack(latlon[0])
  const encodedLon = packer.lon.pack(latlon[1])
  return joinBuffer([encodedLat, encodedLon], Buffer.alloc(useBytes))
}
function splitBuffer (buff) {
  const vals = [0, 0]
  const len = buff.length
  const mid = Math.floor(len / 2)
  const isOdd = len % 2
  for (let ix = 0; ix < len; ix += 1) {
    if (ix < mid) {
      vals[0] = vals[0] * 0x100 + buff[ix]
    } else if (ix === mid && isOdd) {
      vals[0] = vals[0] * 0x10 + (buff[ix] >> 4)
      vals[1] = buff[ix] & 0xF
    } else {
      vals[1] = vals[1] * 0x100 + buff[ix]
    }
  }
  return vals
}
function joinBuffer (vals, buff) {
  const len = buff.length
  const mid = Math.floor(len / 2)
  const isOdd = len % 2
  vals = vals.slice()
  for (let ix = len - 1; ix >= 0; ix -= 1) {
    if (ix < mid) {
      buff[ix] = vals[0] & 0xFF
      vals[0] = Math.floor(vals[0] / 0x100)
    } else if (ix === mid && isOdd) {
      buff[ix] = ((vals[0] & 0xF) * 0x10) + (vals[1] & 0xF)
      vals[0] = Math.floor(vals[0] / 0x10)
    } else {
      buff[ix] = vals[1] & 0xFF
      vals[1] = Math.floor(vals[1] / 0x100)
    }
  }
  return buff
}

function parseUInt (buffer) {
  let val = 0
  for (let i = 0; i < buffer.length; i++) {
    val = val * 0x100 + buffer[i]
  }
  return val
}
function encodeUInt (val) {
  let byteCount = 1
  while (val >= Math.pow(0x100, byteCount)) {
    byteCount += 1
  }
  let buffer = Buffer.alloc(byteCount)
  for (let i = buffer.length - 1; i >= 0; i--) {
    buffer[i] = val & 0xFF
    val = Math.floor(val / 0x100)
  }
  return buffer
}
function parseSInt (buffer) {
  const mult = buffer[0] & 0x80 ? -1 : 1
  let val = buffer[0] & 0x7F
  for (let i = 1; i < buffer.length; i += 1) {
    val = val * 0x100 + buffer[i]
  }
  return mult * val
}
function encodeSInt (val) {
  const sign = val < 0 ? 0x80 : 0
  val = Math.abs(val)
  const bytes = [sign | val & 0x7F]
  val = Math.floor(val / 0x100)
  while (val > 0) {
    bytes.push(val & 0xFF)
    val = Math.floor(val / 0x100)
  }
  return Buffer.from(bytes)
}
function parseBitmap (buffer) {
  const vals = splitBuffer(buffer)
  const dins = {}
  const maxDins = buffer.length * 4
  for (let ix = 0; ix < maxDins; ix += 1) {
    let bitmask = Math.pow(2, ix)
    if (bitmask & vals[0]) {
      dins[ix + 1] = !!(bitmask & vals[1])
    }
  }
  return dins
}
function encodeBitmap (dins) {
  let dinMask = 0
  let dinVals = 0
  for (let ix in dins) {
    let ixVal = parseInt(ix, 10) - 1
    //dinMask += Math.pow(2, ixVal)
    const addVal = 1 << ixVal
    dinMask += addVal
    if (dins[ix]) { dinVals += addVal }
  }
  let bytesNeeded = 1
  while (dinMask >= Math.pow(16, bytesNeeded)) { bytesNeeded += 1 }
  return joinBuffer([dinMask, dinVals], Buffer.alloc(bytesNeeded))
}

// DOP values
function parseDOP (buffer) {
  const vals = [
    buffer[0] >> 6,
    buffer[0] & 0x3F
  ]
  for (let ix = 1; ix < buffer.length; ix += 1) {
    vals[1] = vals[1] * 0x100 + buffer[ix]
  }
  vals[1] /= 10
  return vals
}
function encodeDOP (vals) {
  let dopVal = Math.floor(vals[1] * 10) & 0x3F
  let dopType = (vals[0] << 6) & 0xFF
  return Buffer.from([dopVal + dopType])
}

// Voltage: Battery & Supply
function parseVoltage (buffer) {
  const vals = [
    buffer[0] & 0x80 ? Subtypes.Voltage.Supply : Subtypes.Voltage.Battery,
    buffer[0] & 0x7F
  ]
  for (let ix = 1; ix < buffer.length; ix += 1) {
    vals[1] = vals[1] * 0x100 + buffer[ix]
  }
  vals[1] *= 100
  return vals
}
function encodeVoltage (val) {
  const typeBit = val[0] === Subtypes.Voltage.Supply ? 0x00 : 0x80
  let mvVal = Math.floor(val[1] / 100)
  let valBits = 7
  while (mvVal >= Math.pow(2, valBits)) {
    valBits += 8
  }
  const byteCount = Math.ceil(valBits / 8)
  const buffer = Buffer.alloc(byteCount)
  for (let i = buffer.length - 1; i >= 1; i--) {
    buffer[i] = mvVal & 0xFF
    mvVal = Math.floor(mvVal / 0x100)
  }
  buffer[0] = typeBit | (mvVal & 0x7F)
  return buffer
}

// iButton / hex strings
function parseHex (buffer) {
  return buffer.toString('hex')
}
function encodeHex (val) {
  return Buffer.from(val, 'hex')
}

// Enum
function encodeReason (val) {
  if (typeof val === 'string' && Reasons[val] != null) {
    val = Reasons[val]
  }
  if (val == null) { throw new Error(`Unknown Reason ${val}`) }
  return encodeUInt(val)
}
