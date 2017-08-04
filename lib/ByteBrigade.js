'use strict'

class ByteBrigade {
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
    this.buffer = new Buffer(bitsNeeded / 8)
  }
  set (offset, val) {
    const len = this.lengths[offset]
    const start = this.dividers[offset]
    const end = this.dividers[offset + 1]
    const firstIx = Math.floor(start / 8)
    const lastIx = Math.ceil(end / 8) - 1
    for (let ix = lastIx; ix >= firstIx; ix -= 1) {
      const curVal = this.buffer[ix]
      const ixBit = 8 * ix
      // how many bits overlap?
      if (ix === lastIx) { // last overlap
        const useBits = end - ixBit
        const shift = 8 - useBits
        const frontBits = val & (Math.pow(2, useBits) - 1)
        const endBits = curVal & (Math.pow(2, shift) - 1)
        this.buffer[ix] = (frontBits << shift) | endBits
        val = Math.floor(val / Math.pow(2, useBits))
      } else if (ix > firstIx) { // middle byte
        this.buffer[ix] = val & 0xFF
        val = Math.floor(val / 0x100)
      } else { // firstIx
      }
    }
  }
  get (offset) {
    return offset
  }
  buffer () { return this.buffer }
}

module.exports = ByteBrigade
