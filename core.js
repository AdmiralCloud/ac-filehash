// core.js
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

const createHasher = (implementation) => {
  return {
    async getHash(params) {
      const {
        url,
        s3,
        filePath,
        buffer,
        blob,
        chunkSize = 1 * 1024 * 1024
      } = params || {}

      const type = url ? 'url' : s3 ? 's3' : filePath ? 'file' : blob ? 'blob' : 'buffer'
      let fileSize
      let error
      
      try {
        const result = await implementation.getFileSize({ url, s3, filePath, blob, buffer })
        fileSize = parseInt(result.fileSize)

        if (fileSize > 0) {
          const positions = calculateChunkPositions(fileSize, chunkSize)
          const hash = implementation.createHash()

          for (const pos of positions) {
            const chunk = await implementation.loadChunk({ 
              url, s3, filePath, blob, buffer,
              start: pos.start,
              end: pos.end
            })
            implementation.updateHash(hash, chunk)
          }

          return {
            error: null,
            type,
            hash: implementation.finalizeHash(hash),
            fileSize
          }
        }
        
        error = 'invalidSource'
      }
      catch(e) {
        error = e.message
      }

      return {
        error,
        type,
        hash: null,
        fileSize
      }
    }
  }
}

module.exports = {
  TIMEOUT,
  ALLOWED_PROTOCOLS,
  validateUrl,
  calculateChunkPositions,
  createHasher
}