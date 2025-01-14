const crypto = require('crypto')
const fs = require('fs')
const axios = require('axios')
const { S3Client, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')

const acfilehash = () => {
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

  const loadS3Chunk = async (s3Params, offsetStart, offsetEnd) => {
    const region = s3Params?.region || 'eu-central-1'
    const client = new S3Client({
      region,
      credentials: s3Params.credentials,
    })

    const command = new GetObjectCommand({
      Bucket: s3Params?.bucket,
      Key: s3Params?.key,
      Range: `bytes=${offsetStart}-${offsetEnd - 1}`,
    })
    
    const { Body } = await client.send(command)

    const streamToBuffer = (stream) =>
      new Promise((resolve, reject) => {
        const chunks = []
        stream.on('data', (chunk) => chunks.push(chunk))
        stream.on('error', reject)
        stream.on('end', () => resolve(Buffer.concat(chunks)))
      })

    const bodyContents = await streamToBuffer(Body)
    return {
      data: bodyContents,
    }
  }

  const loadS3fileSize = async (s3Params) => {
    const region = s3Params?.region || 'eu-central-1'
    const client = new S3Client({
      region,
      credentials: s3Params.credentials,
    })

    const command = new HeadObjectCommand({
      Bucket: s3Params?.bucket,
      Key: s3Params?.key,
    })
    
    const response = await client.send(command)
    return {
      fileSize: response.ContentLength,
      contentType: response.ContentType,
    }
  }

  const loadFileChunk = async (url, offsetStart, offsetEnd) => {
    validateUrl(url)

    const axiosParams = {
      url,
      method: 'GET',
      headers: {
        Range: `bytes=${offsetStart}-${offsetEnd - 1}`,
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
    const url = params?.url
    const s3 = params?.s3
    const filePath = params?.filePath
    const chunkSize = params?.chunkSize || 1 * 1024 * 1024
    const type = url ? 'url' : s3 ? 's3' : 'file'

    const hash = crypto.createHash('MD5')
    let fileSize
    let error

    if (url || s3) {
      try {
        const result = s3 ? await loadS3fileSize(s3) : await loadFileSize(url)
        fileSize = parseInt(result.fileSize)
        
        if (fileSize > 0) {
          const positions = calculateChunkPositions(fileSize, chunkSize)
          
          for (const pos of positions) {
            const chunk = s3 
              ? await loadS3Chunk(s3, pos.start, pos.end) 
              : await loadFileChunk(url, pos.start, pos.end)
            hash.update(chunk.data)
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
    else if (filePath) {
      try {
        const file = fs.statSync(filePath)
        fileSize = parseInt(file.size)
        
        if (fileSize > 0) {
          const fd = fs.openSync(filePath, 'r')
          const positions = calculateChunkPositions(fileSize, chunkSize)
          
          for (const pos of positions) {
            const length = pos.end - pos.start
            const buffer = Buffer.alloc(length)
            fs.readSync(fd, buffer, 0, length, pos.start)
            hash.update(buffer)
          }
          
          fs.closeSync(fd)
        }
        else {
          error = 'invalidURL'
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
      type,
      hash: !error && hash.digest('hex'),
      fileSize,
    }
  }

  return {
    getHash,
  }
}

module.exports = acfilehash()