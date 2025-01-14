const SparkMD5 = require('spark-md5')
const axios = require('axios')
const { TIMEOUT, validateUrl, createHasher } = require('./core')

const implementation = {
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
      try {
        const response = await axios({
          url,
          method: 'HEAD',
          timeout: TIMEOUT
        })
        return {
          fileSize: response.headers['content-length'],
          contentType: response.headers['content-type']
        }
      }
      catch {
        throw new Error('invalidURL')
      }
    }
    
    if (blob) return { fileSize: blob.size }
    if (buffer) return { fileSize: buffer.byteLength }
    throw new Error('noSourceSet')
  },

  async loadChunk({ url, blob, buffer, start, end }) {
    if (url) {
      validateUrl(url)
      try {
        const response = await axios({
          url,
          method: 'GET',
          headers: {
            Range: `bytes=${start}-${end - 1}`,
          },
          responseType: 'arraybuffer',
          timeout: TIMEOUT
        })
        return response.data
      }
      catch {
        throw new Error('invalidURL')
      }
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

module.exports = createHasher(implementation)