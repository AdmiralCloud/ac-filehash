const SparkMD5 = require('spark-md5')
const { validateUrl, getUrlFileSize, loadUrlChunk, createHasher } = require('./core')

const browserImplementation = {
  createHash() {
    return new SparkMD5.ArrayBuffer()
  },

  updateHash(hash, chunk) {
    hash.append(chunk)
  },

  finalizeHash(hash) {
    return hash.end()
  },

  async getFileSize({ url, blob, buffer }) {
    if (url) {
      validateUrl(url)
      return await getUrlFileSize(url)
    }
    
    if (blob) return { fileSize: blob.size }
    if (buffer) return { fileSize: buffer.byteLength }
    throw new Error('noSourceSet')
  },

  async loadChunk({ url, blob, buffer, start, end }) {
    if (url) {
      validateUrl(url)
      return await loadUrlChunk(url, start, end)
    }
    
    if (blob) {
      const slice = blob.slice(start, end)
      return await slice.arrayBuffer()
    }
    
    if (buffer) {
      return buffer.slice(start, end)
    }
    
    throw new Error('noSourceSet')
  }
}

module.exports = createHasher(browserImplementation)