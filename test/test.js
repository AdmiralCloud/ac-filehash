const fs = require('fs')
const http = require('http')
const crypto = require('crypto')
const { expect } = require('chai')
const { S3Client } = require('@aws-sdk/client-s3')
const acfh = require('../index')
const acfhBrowser = require('../browser')
const { createContent, FILE_SIZE, FILE_PATH } = require('./createTestfile')

const md5 = (...buffers) => {
  const hash = crypto.createHash('md5')
  buffers.forEach(b => hash.update(b))
  return hash.digest('hex')
}

const content = createContent()
// file is smaller than chunkSize -> all 3 chunks cover the whole file
const expectedHash = md5(content, content, content)
const expectedFileSize = FILE_SIZE
const invalidUrl = 'http://127.0.0.1:1/missing.mp4'

let server
let url

const expectationCheck = (test) => {
  expect(test.type).to.eql('url')
  expect(test.hash).to.eql(expectedHash)
  expect(test.fileSize).to.eql(expectedFileSize)
}

before(async () => {
  fs.writeFileSync(FILE_PATH, content)

  server = http.createServer((req, res) => {
    if (req.url === '/brokenChunks.mp4') {
      // size is available, but loading the chunks fails
      if (req.method === 'HEAD') {
        res.writeHead(200, { 'Content-Length': content.length })
      }
      else {
        res.writeHead(500)
      }
      return res.end()
    }
    if (req.url !== '/testfile.mp4') {
      res.writeHead(404)
      return res.end()
    }
    if (req.url === '/testfile.mp4' && req.method === 'HEAD') {
      res.writeHead(200, { 'Content-Length': content.length, 'Content-Type': 'video/mp4' })
      return res.end()
    }
    const match = /bytes=(\d+)-(\d+)/.exec(req.headers.range || '')
    const start = match ? parseInt(match[1]) : 0
    const end = match ? parseInt(match[2]) : content.length - 1
    res.writeHead(206, { 'Content-Type': 'video/mp4' })
    res.end(content.subarray(start, end + 1))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  url = `http://127.0.0.1:${server.address().port}/testfile.mp4`
})

after(async () => {
  server.closeAllConnections()
  await new Promise(resolve => server.close(resolve))
})

describe('Compare values', () => {
  it('Test local file', async () => {
    const test = await acfh.getHash({ filePath: FILE_PATH })
    expect(test.type).to.eql('file')
    expect(test.hash).to.eql(expectedHash)
    expect(test.fileSize).to.eql(expectedFileSize)
  })

  it('Test URL', async () => {
    const test = await acfh.getHash({ url })
    expectationCheck(test)
  })

  it('Test non existing URL', async () => {
    const test = await acfh.getHash({ url: invalidUrl })
    expect(test.error).to.eql('invalidURL')
  })

  it('Test URL with failing chunk request', async () => {
    const test = await acfh.getHash({ url: url.replace('testfile.mp4', 'brokenChunks.mp4') })
    expect(test.error).to.eql('invalidURL')
    expect(test.fileSize).to.eql(expectedFileSize)
  })

  it('Test non existing local file', async () => {
    const test = await acfh.getHash({ filePath: './test/testfile1.mp4' })
    expect(test.error).to.eql("ENOENT: no such file or directory, stat './test/testfile1.mp4'")
  })

  it('Test invalid url', async () => {
    const test = await acfh.getHash({ url: 'ftp://storage.com/testFile' })
    expect(test.error).to.eql('invalidProtocol')
  })

  it('Test without params', async () => {
    const test = await acfh.getHash()
    expect(test.error).to.eql('noSourceSet')
  })

  it('Test empty params', async () => {
    const test = await acfh.getHash({})
    expect(test.error).to.eql('noSourceSet')
    expect(test.type).to.eql('unknown')
  })

  it('Test empty file', async () => {
    const emptyFile = './test/emptyfile.tmp'
    fs.writeFileSync(emptyFile, '')
    try {
      const test = await acfh.getHash({ filePath: emptyFile })
      expect(test.error).to.eql('invalidURL')
      expect(test.hash).to.eql(null)
      expect(test.fileSize).to.eql(0)
    }
    finally {
      fs.unlinkSync(emptyFile)
    }
  })

  it('Test small chunkSize (non overlapping chunks)', async () => {
    const chunkSize = 1000
    const size = content.length
    const middleStart = Math.floor(size / 2 - chunkSize / 2)
    const expected = md5(
      content.subarray(0, chunkSize),
      content.subarray(middleStart, Math.floor(size / 2 + chunkSize / 2)),
      content.subarray(size - chunkSize)
    )
    const fromFile = await acfh.getHash({ filePath: FILE_PATH, chunkSize })
    expect(fromFile.hash).to.eql(expected)
    const fromUrl = await acfh.getHash({ url, chunkSize })
    expect(fromUrl.hash).to.eql(expected)
    const fromBrowser = await acfhBrowser.getHash({ buffer: content, chunkSize })
    expect(fromBrowser.hash).to.eql(expected)
  })
})

describe('S3', () => {
  const s3 = { bucket: 'bucket', key: 'key', region: 'eu-west-1', credentials: { accessKeyId: 'a', secretAccessKey: 'b' } }
  let originalSend

  before(() => {
    originalSend = S3Client.prototype.send
  })

  afterEach(() => {
    S3Client.prototype.send = originalSend
  })

  it('Test S3 object', async () => {
    S3Client.prototype.send = async (command) => {
      if (command.constructor.name === 'HeadObjectCommand') {
        expect(command.input).to.eql({ Bucket: 'bucket', Key: 'key' })
        return { ContentLength: content.length, ContentType: 'video/mp4' }
      }
      const match = /bytes=(\d+)-(\d+)/.exec(command.input.Range)
      const { Readable } = require('stream')
      return { Body: Readable.from([content.subarray(parseInt(match[1]), parseInt(match[2]) + 1)]) }
    }
    const test = await acfh.getHash({ s3 })
    expect(test.type).to.eql('s3')
    expect(test.hash).to.eql(expectedHash)
    expect(test.fileSize).to.eql(expectedFileSize)
  })

  it('Test S3 without region and credentials', async () => {
    S3Client.prototype.send = async () => ({ ContentLength: 0 })
    const test = await acfh.getHash({ s3: { bucket: 'bucket', key: 'key' } })
    expect(test.type).to.eql('s3')
    expect(test.error).to.eql('invalidURL')
  })

  it('Test S3 error', async () => {
    S3Client.prototype.send = async () => { throw new Error('NoSuchKey') }
    const test = await acfh.getHash({ s3 })
    expect(test.error).to.eql('NoSuchKey')
    expect(test.hash).to.eql(null)
  })

  it('Test S3 stream error', async () => {
    const { Readable } = require('stream')
    S3Client.prototype.send = async (command) => {
      if (command.constructor.name === 'HeadObjectCommand') { return { ContentLength: 100 } }
      return { Body: new Readable({ read() { this.destroy(new Error('streamFailed')) } }) }
    }
    const test = await acfh.getHash({ s3 })
    expect(test.error).to.eql('streamFailed')
  })
})

describe('Browser', () => {
  it('Browser function - Test buffer from local file', async () => {
    const buffer = fs.readFileSync(FILE_PATH)
    const test = await acfhBrowser.getHash({ buffer })
    expect(test.type).to.eql('buffer')
    expect(test.hash).to.eql(expectedHash)
    expect(test.fileSize).to.eql(expectedFileSize)
  })

  it('Browser function - Test blob', async () => {
    const blob = new Blob([content])
    const test = await acfhBrowser.getHash({ blob })
    expect(test.type).to.eql('blob')
    expect(test.hash).to.eql(expectedHash)
    expect(test.fileSize).to.eql(expectedFileSize)
  })

  it('Browser function - Test URL', async () => {
    const test = await acfhBrowser.getHash({ url })
    expectationCheck(test)
  })

  it('Browser function - Test non existing URL', async () => {
    const test = await acfhBrowser.getHash({ url: invalidUrl })
    expect(test.error).to.eql('invalidURL')
  })

  it('Browser function - Test invalid url', async () => {
    const test = await acfhBrowser.getHash({ url: 'ftp://storage.com/testFile' })
    expect(test.error).to.eql('invalidProtocol')
  })

  it('Browser function - Test wrong buffer type', async () => {
    const test = await acfhBrowser.getHash({ arrayBuffer: '' })
    expect(test.error).to.eql('noSourceSet')
  })

  it('Browser function - Test without params', async () => {
    const test = await acfhBrowser.getHash()
    expect(test.error).to.eql('noSourceSet')
  })
})
