/* eslint-env mocha */

require('should')
const TimeData = require('../')

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
    console.log(coord)
  })
  it('should encode most data we are interested in', function () {
    let td = new TimeData(new Date())
    td.setSpeed(9)
    td.setCoordinate([53.57148, 9.8247866])
    td.setHeading(70)
    td.setAltitude(28)
    td.setSatellites(14)
    td.setTransmissionStamp(new Date())
    td.setDOP([TimeData.DOP.HDOP, 0.7])
    td.setDOP([TimeData.DOP.PDOP, 1.1])
    td.setDistance(2)
    td.setVoltage([TimeData.Voltage.Battery, 4024])
    td.setVoltage([TimeData.Voltage.Supply, 14098])
    td.setDINStatus([1, true])
    td.setReason(TimeData.Reasons.DIN)
    td.setDINIndex(1)
    let buffer = td.toBuffer()
    let data = TimeData.read(buffer)[0]
    console.log(data)
  })
})
