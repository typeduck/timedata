/* eslint-env mocha */

require('should')
const TimeData = require('../')

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
      (0 << 4) | 6,
      0x01, 0x5d, 0x62, 0x05, 0x3a, 0xf7,
      (2 << 4) | 1,
      12,
      (15 << 4) | 1, 0,
      1,
      (0 << 4) | 6,
      0x01, 0x5d, 0x62, 0x05, 0x3a, 0xd7,
      (2 << 4) | 1,
      12,
      (15 << 4) | 1, 0,
      1
    ])
    let data = TimeData.read(buffer)
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
      console.log(diff)
    }
  })
})
