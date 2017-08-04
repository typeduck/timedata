'use strict'

function mask (s, e) {
  return (Math.pow(2, 8 - s) - 1) ^ (Math.pow(2, e) - 1)
}
const MASKS = {
  existing: [],
  value: []
}
const POW2 = []
for (let s = 0; s <= 8; s++) { POW2.push(Math.pow(2, s)) }
for (let s = 0; s < 8; s++) {
  let existing = []
  let value = []
  MASKS.existing.push(existing)
  MASKS.value.push(value)
  for (let e = 0; e < 8; e++) {
    let m = mask(s, e)
    existing.push(0xFF ^ m)
    value.push(m)
  }
}

class BitBuffer {
  constructor (lengths) {
    if (typeof lengths === 'number') {
      lengths = Array.prototype.slice.apply(arguments)
    } else if (!Array.isArray(lengths)) {
      throw new Error(`Bad Parameter ${lengths}`)
    }
    this.dividers = [0]
    this.lengths = lengths.slice().map((k) => parseInt(k, 10))
    let bitsNeeded = 0
    for (let numBits of this.lengths) {
      this.dividers.push(bitsNeeded += numBits)
    }
    this.buffer = Buffer.alloc(Math.ceil(bitsNeeded / 8))
  }
  set (offset, val) {
    this._checkOffset(offset)
    const start = this.dividers[offset]
    const end = this.dividers[offset + 1]
    if (val < 0 || val > Math.pow(2, this.lengths[offset]) - 1) {
      throw new Error(`Value ${val} cannot fit in ${this.lengths[offset]} bits`)
    }
    const ixMin = Math.floor(start / 8)
    let ix = Math.ceil(end / 8)
    while (--ix >= ixMin) {
      const curVal = this.buffer[ix]
      const ixBitStart = 8 * ix
      const ixBitEnd = ixBitStart + 8
      const endLopBits = Math.max(ixBitEnd - end, 0)
      const startLopBits = Math.max(start - ixBitStart, 0)
      const useBits = 8 - endLopBits - startLopBits
      let bitMask = MASKS.existing[startLopBits][endLopBits]
      let newVal = ((val & (POW2[useBits] - 1)) << endLopBits) + (bitMask & curVal)
      this.buffer[ix] = newVal
      val = Math.floor(val / POW2[useBits])
    }
  }
  get (offset) {
    this._checkOffset(offset)
    let val = 0
    const start = this.dividers[offset]
    const end = this.dividers[offset + 1]
    const ixMax = Math.ceil(end / 8)
    let ix = Math.floor(start / 8) - 1
    while (++ix < ixMax) {
      const curVal = this.buffer[ix]
      const ixBitStart = 8 * ix
      const ixBitEnd = ixBitStart + 8
      const endLopBits = Math.max(ixBitEnd - end, 0)
      const startLopBits = Math.max(start - ixBitStart, 0)
      const useBits = 8 - endLopBits - startLopBits
      const bitMask = MASKS.value[startLopBits][endLopBits]
      val *= POW2[useBits]
      val += ((bitMask & curVal) >> endLopBits)
    }
    return val
  }
  _checkOffset (offset) {
    if (offset < 0 || offset > this.dividers.length - 2) {
      throw new Error(`Offset ${offset} is outside of declared range`)
    }
  }
}

module.exports = BitBuffer
