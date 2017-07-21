# TimeData

TimeData is a binary data format crafted for transmitting and storing arbitrary
time series data, optimized for common location data information.

## Terminology

- Chunk: an atomic piece of information in the TimeData format
- Block: a set of chunks of data, all belonging to the same point in time

The rest of this document describes the format of a Block of data and its
Chunks.

A Chunk of data consists of the following, in this order:

- 1 Type+Length Byte
- 0 or more additional Type Bytes
- 0 or more additional Length Bytes
- 1 or more Payload Byte(s)

```text
                     1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|   T1  |   L1  |     T2...     |     L2...     | Payload...
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### Type+Length Header Bytes

The first byte is a "split" byte, in which information about the type and length
are combined into two nibbles:

The first four bits are the Type bits, and they determine the Type of the
Payload:

```text
0000 (0)  - Timestamp
0001 (1)  - Coordinates (Latitude + Longitude)
0010 (2)  - Speed (UInt)
0011 (3)  - Heading (UInt)
0100 (4)  - Altitude (UInt)
0101 (5)  - Digital Input & Status Bitmap
0110 (6)  - Distance Accumulation
0111 (7)  - Satellite Count
1000 (8)  - Transmission Timestamp
1001 (9)  - DOP Measurement
1010 (10) - Millivolt Measurement
1011 (11) - RESERVED
1100 (12) - Temperature
1101 (13) - 1-Wire Data
1110 (14) - Logging Reason
1111 0000 0000 (15) - Digital/Analog Input Reason Index
1111 0000 0001 (16) - Relative Humidity
1111 0000 0002 (17) - RESERVED
1111 0000 0003 (18) - RESERVED
1111 0000 0004 (19) - RESERVED
1111 0000 0005 (20) - RESERVED
```

### Digital Input & Status Bitmap

A Digital Input & Status Bitmap consists of two halves of equal length:

- The first half is a bitmask, declaring the meaningful bits in the second half
- The second half is a map of on (1) or off (0) statuses

The bit positions have the following meaning:

0. Power Connected Status
1. DIN 1 status
2. DIN 2 status
3. DIN 3 status


A value of `1111 (15)` indicates that at least one additional Type Byte follows
the Type+Length Byte header. Each additional Type Byte should be summed with the
previous values to determine the Type.

Analog to the overflow value of `111 (7)`, each additional Type Byte indicates
an overflow (i.e. another Type Byte follows) with the maximum byte value of
`11111111 (255)`. The additional Type Bytes may be zero, as in this example a
new Type having value `7` would be indicated (Length bits indicated w/ "x"):

```text
111x xxxx 0000 0000...
```

An implementation of TimeData must ignore new Types that are not known without
fatal error. It can do this using the Length Bytes.

The last five bits of the Type+Length Header Byte indicate the length. They
should be interpreted as an unsigned integer.

Similar to the "overflow" indicated in the Type Byte, a "full" value (all ones)
of the Length bits indicates that another Length Byte follows (after all Type
Bytes), and the total length is the **sum** of all values of the Length Bytes.

Therefore, we can express 15 different types, and Payload length up to 15 without
any additional Type / Length bytes.

### Property ID

Following the Type+Length Bytes are zero or more additional so-called "property
ID" bytes, indicating what the data *represents* (**not** the base type of the
data). The ***only*** data which does not have a Property ID is that with the
Type of `0` (bits `000` in Type+Length Header), as Type `0` indicates the
timestamp for all chunks following it (and is primary importance in this
format).
