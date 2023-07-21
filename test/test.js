const fs = require('fs')
const { expect } = require('chai')
const acfh = require('../index')
const acfhBrowser = require('../browser')

const expectedHash = 'f9ccc07b4959f5698fd30913743aacd5'
const expectedFileSize = 158008374

describe('Compare values', () => {
  it('Test local file', async () => {
    let test = await acfh.getHash({ filePath: './test/testfile.mp4' })
    expect(test.type).to.eql('file')
    expect(test.hash).to.eql(expectedHash)
    expect(test.fileSize).to.eql(expectedFileSize)
  })

  it('Test URL', async () => {
    let test = await acfh.getHash({ url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' })
    expect(test.type).to.eql('url')
    expect(test.hash).to.eql(expectedHash)
    expect(test.fileSize).to.eql(expectedFileSize)
  })

  it('Test non existing URL', async () => {
    let test = await acfh.getHash({ url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp3' })
    expect(test.error).to.eql('invalidURL')
  })

  it('Test non existing local file', async () => {
    let test = await acfh.getHash({ filePath: './test/testfile1.mp4' })
    expect(test.error).to.eql("ENOENT: no such file or directory, open './test/testfile1.mp4'")
  })

  it('Test without params', async () => {
    let test = await acfh.getHash()
    expect(test.error).to.eql('noSourceSet')
  })

  it('Browser function - Test buffer from local file', async () => {
    const buffer = fs.readFileSync('./test/testfile.mp4')
    let test = await acfhBrowser.getHash({ buffer })
    expect(test.type).to.eql('buffer')
    expect(test.hash).to.eql(expectedHash)
    expect(test.fileSize).to.eql(expectedFileSize)
  })

  it('Browser function - Test URL', async () => {
    let test = await acfhBrowser.getHash({ url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' })
    expect(test.type).to.eql('url')
    expect(test.hash).to.eql(expectedHash)
    expect(test.fileSize).to.eql(expectedFileSize)
  })

  it('Browser function - Test non existing URL', async () => {
    let test = await acfhBrowser.getHash({ url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp3' })
    expect(test.error).to.eql('invalidURL')
  })

  it('Browser function - Test wrong buffer type', async () => {
    let test = await acfhBrowser.getHash({ arrayBuffer: '' })
    expect(test.error).to.eql('noSourceSet')
  })

  it('Browser function - Test without params', async () => {
    let test = await acfhBrowser.getHash()
    expect(test.error).to.eql('noSourceSet')
  })
})
