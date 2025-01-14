const SparkMD5 = require('spark-md5')
const axios = require('axios')

const acfilehash = () => {
  const TIMEOUT = 30000
  const ALLOWED_PROTOCOLS = ['http:', 'https:']

  const validateUrl = (url) => {
    const parsedUrl = new URL(url)
    if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      throw new Error('invalidProtocol')
    }
  }


  const loadFileChunk = async (url, offsetStart, offsetEnd) => {
    validateUrl(url)
    const axiosParams = {
      url,
      method: 'GET',
      headers: {
        Range: 'bytes=' + offsetStart + '-' + (offsetEnd - 1),
      },
      responseType: 'arraybuffer',
      timeout: TIMEOUT
    }
    return await axios(axiosParams)
  }

  const loadFileSize = async (url) => {
    validateUrl(url)
    try {
      const axiosParams = {
        url,
        method: 'HEAD',
        timeout: TIMEOUT
      }
      const response = await axios(axiosParams)
      return {
        fileSize: response.headers['content-length'],
        contentType: response.headers['content-type'],
      }
    } 
    catch (error) {
      return {
        status: error.status || 999,
        statusText: error.statusText || 'errorOccurred',
      }
    }
  }

  const getHash = async (params) => {
    const url = params && params.url
    const buffer = params && params.buffer
    const blob = params && params.blob
    const chunkSize = (params && params.chunkSize) || 1 * 1024 * 1024

    let hash = new SparkMD5.ArrayBuffer()
    let fileSize
    let error

    if (url) {
      try {
        const result = await loadFileSize(url)
        fileSize = parseInt(result.fileSize)
        if (fileSize > 0) {
          const pos = [
            { start: 0, end: Math.min(fileSize, chunkSize) },
            {
              start: Math.max(0, Math.floor(fileSize / 2 - chunkSize / 2)),
              end: Math.min(fileSize, Math.max(0, Math.floor(fileSize / 2 - chunkSize / 2)) + chunkSize),
            },
            { start: Math.max(0, Math.floor(fileSize - chunkSize)), end: fileSize },
          ]
          for (let i = 0; i < pos.length; i++) {
            const start = pos[i].start
            const end = pos[i].end
            const chunk = await loadFileChunk(url, start, end)
            hash.append(chunk.data)
          }
        } 
        else {
          error = 'invalidURL'
        }
      }
      catch(e) {
        error = e.message     
      }
    } 
    else if (blob) {
      try {
        hash = new SparkMD5.ArrayBuffer()
        fileSize = blob.size

        const pos = [
          { position: 0 },
          { position: Math.max(0, Math.floor(fileSize / 2 - chunkSize / 2)) },
          { position: Math.max(0, Math.floor(fileSize - chunkSize)) },
        ]
        for (let i = 0; i < pos.length; i++) {
          const length = Math.min(fileSize, chunkSize)
          const position = pos[i].position
          const slice = blob.slice(position, position + length)
          const sliceBuffer = await slice.arrayBuffer()
          hash.append(sliceBuffer)
        }
      } 
      catch (e) {
        error = e.message
      }
    } 
    else if (buffer) {
      try {
        hash = new SparkMD5.ArrayBuffer()
        fileSize = buffer.byteLength

        const pos = [
          { position: 0 },
          { position: Math.max(0, Math.floor(fileSize / 2 - chunkSize / 2)) },
          { position: Math.max(0, Math.floor(fileSize - chunkSize)) },
        ]
        for (let i = 0; i < pos.length; i++) {
          const length = Math.min(fileSize, chunkSize)
          const position = pos[i].position
          const slice = buffer.slice(position, position + length)
          hash.append(slice)
        }
      } 
      catch (e) {
        error = e.message
      }
    } 
    else {
      error = 'noSourceSet'
    }
    
    return {
      error,
      type: url ? 'url' : blob ? 'blob' : 'buffer',
      hash: !error && hash.end(),
      fileSize,
    }
  }

  return {
    getHash,
  }
}

module.exports = acfilehash()
