'use strict'

class ApproximateRange {
  constructor (bits, min, max) {
    this.bits = bits
    this.maxBitValue = Math.pow(2, bits) - 1
    this.max = max
    this.min = min
    this.range = this.max - this.min
  }
  pack (val) {
    if (isNaN(val) || val < this.min || val > this.max) {
      throw new Error(`Value "${val}" outside range '${this.min} - ${this.max}'`)
    }
    return Math.round((val - this.min) / this.range * this.maxBitValue)
  }
  unpack (val) {
    if (isNaN(val) || val < 0 || val > this.maxBitValue) {
      throw new Error(`Value "${val}" outside range 0-(${this.maxBitValue})`)
    }
    return this.min + val / this.maxBitValue * this.range
  }
}

module.exports = ApproximateRange
