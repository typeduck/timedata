/* eslint-env mocha */

require('should')
const TimeData = require('../')

describe('BitBuffer', function () {
  const BitBuffer = require('./BitBuffer')
  let bb
  it('should allow list of arguments', function () {
    bb = new BitBuffer(2, 4, 2)
    bb.set(0, 3)
    bb.set(1, 15)
    bb.set(2, 3)
    bb.get(0).should.equal(3)
    bb.get(1).should.equal(15)
    bb.get(2).should.equal(3)
    bb = new BitBuffer(3, 5)
    bb.set(0, 5)
    bb.set(1, 13)
    bb.get(0).should.equal(5)
    bb.get(1).should.equal(13)
    bb = new BitBuffer(20, 20)
    bb.set(0, Math.pow(2, 20) - 1)
    bb.set(1, Math.pow(2, 20) - 1)
    for (let byte of bb.buffer) {
      byte.should.equal(255)
    }
  })
  it('should encode/decode all possible values up to 10 bits', function () {
    bb = new BitBuffer(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
    for (let i = 0; i < 10; i++) {
      let min = 0
      let max = Math.pow(2, i + 1) - 1
      for (let val = min; val <= max; val++) {
        bb.set(i, val)
        bb.get(i).should.equal(val)
      }
    }
  })
  it('should throw error when given out-of-range values', function () {
    bb = new BitBuffer(1, 2, 3, 4)
    const setlow = function () { bb.set(-1, 0) }
    const sethigh = function () { bb.set(4, 0) }
    const getlow = function () { bb.get(-1) }
    const gethigh = function () { bb.get(4) }
    setlow.should.throw()
    sethigh.should.throw()
    getlow.should.throw()
    gethigh.should.throw()
    for (let i = 0; i < 4; i++) {
      let min = 0
      let max = Math.pow(2, i + 1) - 1
      const under = function () { bb.set(i, min - 1) }
      const over = function () { bb.set(i, max + 1) }
      under.should.throw()
      over.should.throw()
    }
  })
})

function createTimeData () {
  const td = new TimeData(new Date())
  td.setSpeed(Math.floor(Math.random() * 300))
  td.setCoordinate([53.57148, 9.8247866, 4])
  td.setHeading(Math.floor(Math.random() * 360))
  td.setAltitude(-10 + Math.floor(Math.random() * 1000))
  td.setSatellites(7 + Math.floor(Math.random() * 7))
  td.setTransmissionStamp(new Date(Date.now() + 1000 + Math.floor(Math.random() * 5000)))
  td.setDOP([TimeData.DOP.HDOP, 0.5 + Math.random() * 3])
  td.setDOP([TimeData.DOP.PDOP, 0.7 + Math.random() * 2])
  td.setDistance(Math.floor(Math.random() * 500))
  td.setVoltage([TimeData.Voltage.Battery, 3000 + Math.floor(Math.random() * 1000)])
  td.setVoltage([TimeData.Voltage.Supply, 12000 + Math.floor(Math.random() * 2000)])
  td.setDINStatus([1, Math.random() < 0.5])
  td.setDINStatus([2, Math.random() < 0.5])
  td.setDINStatus([3, Math.random() < 0.5])
  td.setDINStatus([4, Math.random() < 0.5])
  td.setReason(Math.floor(Math.random() * 3))
  td.setDINIndex(Math.ceil(Math.random() * 4))
  return td
}

describe('TimeData', function () {
  it('should read a binary buffer', function () {
    const buffer = Buffer.from([
      (0 << 4) | 5,
      0x01, 0x5d, 0x62, 0x05, 0x3a, 0xf7,
      (2 << 4) | 0,
      12,
      (15 << 4) | 0, 0,
      1,
      (0 << 4) | 5,
      0x01, 0x5d, 0x62, 0x05, 0x3a, 0xd7,
      (2 << 4) | 0,
      12,
      (15 << 4) | 0, 0,
      1
    ])
    let data = TimeData.read(buffer)
    // console.log(data[0], data[1])
    data.length.should.equal(2)
    data[0].getSpeed().should.equal(12)
    data[1].getSpeed().should.equal(12)
  })
  it('should write a binary buffer', function () {
    let td = new TimeData(new Date())
    td.setSpeed(266)
    td.setHeading(359)
    td.setCoordinate([53.57, 10.643])
    let buffer = td.toBuffer()
    let data = TimeData.read(buffer)[0]
    data.getSpeed().should.equal(266)
    let coord = data.getCoordinate()
    coord[0].should.be.approximately(53.57, 0.001)
    coord[1].should.be.approximately(10.643, 0.0001)
  })
  it('should encode most data we are interested in', function () {
    const td = createTimeData()
    let buffer = td.toBuffer()
    TimeData.read(buffer)[0]
  })
  it('should be OK with performance of encoding/decoding', function () {
    const timeData = []
    const maxcount = 10000
    for (let i = 0; i < maxcount; i += 1) {
      timeData.push(createTimeData())
    }
    const buffers = []
    let ts = Date.now()
    for (let td of timeData) {
      buffers.push(td.toBuffer())
    }
    let diffs = []
    diffs.push(Date.now() - ts)
    ts = Date.now()
    let allData = Buffer.concat(buffers)
    diffs.push(Date.now() - ts)
    ts = Date.now()
    let decoded = TimeData.read(allData)
    diffs.push(Date.now() - ts)
    decoded.length.should.equal(maxcount)
    for (let diff of diffs) {
      (diff < 1000).should.be.true()
    }
  })
})
