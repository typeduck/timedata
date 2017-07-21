// This file contains parsers for all the payload types
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
exports.Reason = { decode: parseReason, encode: encodeReason, type: 14 }
exports.DINIndex = { decode: parseUInt, encode: encodeUInt, type: 15 }
exports.Humidity = { decode: parseUInt, encode: parseUInt, type: 16 }

const reverseTypes = {}
for (let ptype in exports) {
  let payloadType = exports[ptype]
  payloadType.name = ptype
  reverseTypes[payloadType.type] = payloadType
}
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
  const packer = getPacker(7)
  const encodedLat = packer.lat.pack(latlon[0])
  const encodedLon = packer.lon.pack(latlon[1])
  return joinBuffer([encodedLat, encodedLon], Buffer.alloc(7))
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
  return val
}
function parseBitmap (buffer) {
  throw new Error('not yet implemented')
}
function encodeBitmap (val) {
  throw new Error('not yet implemented')
}

// DOP values
function parseDOP (buffer) {
  return parseUInt(buffer) / 10
}
function encodeDOP (val) {
  return encodeUInt(val * 10)
}

// Voltage: Battery & Supply
function parseVoltage (buffer) {
  throw new Error('not yet implemented')
}
function encodeVoltage (val) {
  throw new Error('not yet implemented')
}

// iButton / hex strings
function parseHex (buffer) {
  return buffer.toString('hex')
}
function encodeHex (val) {
  return Buffer.from(val, 'hex')
}

// Enum
function parseReason (buffer) {
  throw new Error('not yet implemented')
}
function encodeReason (val) {
  throw new Error('not yet implemented')
}
