const axios = require('axios')

const TIMEOUT = 30000
const ALLOWED_PROTOCOLS = ['http:', 'https:']

const validateUrl = (url) => {
  const parsedUrl = new URL(url)
  if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
    throw new Error('invalidProtocol')
  }
}

const calculateChunkPositions = (fileSize, chunkSize) => {
  return [
    { 
      start: 0, 
      end: Math.min(fileSize, chunkSize) 
    },
    {
      start: Math.max(0, Math.floor(fileSize / 2 - chunkSize / 2)),
      end: Math.min(fileSize, Math.floor(fileSize / 2 + chunkSize / 2))
    },
    { 
      start: Math.max(0, fileSize - chunkSize), 
      end: fileSize 
    }
  ]
}

const loadUrlChunk = async (url, start, end) => {
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

const getUrlFileSize = async (url) => {
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

const createHasher = (implementation) => {
  return {
    async getHash(params) {
      if (!params) {
        return {
          error: 'noSourceSet',
          type: 'unknown',
          hash: null,
          fileSize: undefined
        }
      }

      const chunkSize = params?.chunkSize || 1 * 1024 * 1024
      let fileSize
      let error

      try {
        const result = await implementation.getFileSize(params)
        fileSize = parseInt(result.fileSize)
        
        if (fileSize > 0) {
          const hash = implementation.createHash()
          const positions = calculateChunkPositions(fileSize, chunkSize)
          
          for (const pos of positions) {
            const chunk = await implementation.loadChunk({ 
              ...params,
              start: pos.start,
              end: pos.end 
            })
            implementation.updateHash(hash, chunk)
          }

          return {
            error: null,
            type: determineType(params),
            hash: implementation.finalizeHash(hash),
            fileSize
          }
        }
        
        error = 'invalidURL'
      }
      catch(e) {
        error = e.message
      }

      return {
        error,
        type: determineType(params),
        hash: null,
        fileSize
      }
    }
  }
}

const determineType = (params) => {
  if (!params) return 'unknown'
  if (params.url) return 'url'
  if (params.s3) return 's3'
  if (params.filePath) return 'file'
  if (params.blob) return 'blob'
  if (params.buffer) return 'buffer'
  return 'unknown'
}

module.exports = {
  validateUrl,
  getUrlFileSize,
  loadUrlChunk,
  createHasher,
  TIMEOUT,
  ALLOWED_PROTOCOLS
}