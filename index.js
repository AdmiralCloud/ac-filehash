const crypto = require('crypto')
const fs = require('fs')
const axios = require('axios')
const { S3Client, GetObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

const acfilehash = () => {

  const loadS3Chunk = async(s3Params, offsetStart, offsetEnd) => {
    const region = s3Params?.region || 'eu-central-1'
    const clientParams = { 
      region,
      credentials: s3Params.credentials
    }
    const client = new S3Client(clientParams)

    const inputParams = {
      Bucket: s3Params?.bucket,
      Key: s3Params?.key,
      Range: 'bytes=' + offsetStart + '-' + (offsetEnd-1)
    }
    const command = new GetObjectCommand(inputParams)
    const { Body } = await client.send(command)
    
    const streamToString = (stream) =>
      new Promise((resolve, reject) => {
        const chunks = []
        stream.on("data", (chunk) => chunks.push(chunk))
        stream.on("error", reject)
        stream.on("end", () => resolve(Buffer.concat(chunks)))
      })

    const bodyContents = await streamToString(Body);
    return {
      data: bodyContents
    }
  }

  const loadS3fileSize = async(s3Params) => {
    const region = s3Params?.region || 'eu-central-1'
    const clientParams = { 
      region,
      credentials: s3Params.credentials
    }
    const client = new S3Client(clientParams)

    const input = {
      Bucket: s3Params?.bucket,
      Key: s3Params?.key,
    }
    const command = new HeadObjectCommand(input)
    const response = await client.send(command)
    return {
      fileSize: response.ContentLength,
      contentType: response.ContentType
    }
  }

  const loadFileChunk = async(url, offsetStart, offsetEnd) => {
    const axiosParams = {
      url,
      method: 'GET',
      headers: {
        Range: 'bytes=' + offsetStart + '-' + (offsetEnd-1),
      },
      responseType: 'arraybuffer'
    }
    return await axios(axiosParams)
  }

  const loadFileSize = async(url) => {
    try {
      const axiosParams = {
        url,
        method: 'HEAD',
      }
      const response = await axios(axiosParams)
      return {
        fileSize: response.headers['content-length'],
        contentType: response.headers['content-type']
      }
    }
    catch (error) {
      return {
        status: error.status || 999,
        statusText: error.statusText || 'errorOccurred'
      }
    }
  }

  
  const getHash = async(params) => {
    const url = params && params.url
    const s3 = params && params.s3
    const filePath = params && params.filePath
    const chunkSize = (params && params.chunkSize) || 1 * 1024 * 1024
    const type = url ? 'url' : s3 ? 's3' : 'file'

    let hash = crypto.createHash('MD5')
    let fileSize
    let error


    if (url || s3) {
      const result = s3 ? await loadS3fileSize(s3) : await loadFileSize(url)
      fileSize = parseInt(result.fileSize)
      if (fileSize > 0) {
        const pos = [
          { start: 0, end: Math.min(fileSize, chunkSize) },
          { start: Math.max(0, Math.floor(fileSize / 2 - chunkSize / 2)), end: Math.min(fileSize, (Math.max(0, Math.floor(fileSize / 2 - chunkSize / 2))) + chunkSize) },
          { start: Math.max(0, Math.floor(fileSize - chunkSize)), end: fileSize }
        ]
        for (let i = 0; i < pos.length; i++) {
          const start = pos[i].start
          const end = pos[i].end
          const chunk = s3 ? await loadS3Chunk(s3, start, end) : await loadFileChunk(url, start, end)
          hash.update(chunk.data)
        }
      }
      else {
        error = 'invalidURL'
      }
    }
    else if (filePath) {
      try {
        hash = crypto.createHash('MD5');
        const fd = fs.openSync(filePath, 'r')
        const file = fs.statSync(filePath)
        fileSize = parseInt(file.size)

        const pos = [
          { position: 0 },
          { position: Math.max(0, Math.floor(fileSize / 2 - chunkSize / 2)) },
          { position: Math.max(0, Math.floor(fileSize - chunkSize)) }
        ]
        for (let i = 0; i < pos.length; i++) {
          const length = Math.min(fileSize, chunkSize)
          const position = pos[i].position
          const buffer = Buffer.alloc(length)
          fs.readSync(fd, buffer, 0, length, position)
          hash.update(buffer)
        } 
      }
      catch(e) {
        error = e.message
      }     
    }
    else {
      error = 'noSourceSet'
    }
    return {
      error,
      type,
      hash:  !error && hash.digest('hex'),
      fileSize
    }
}


  return {
    getHash
  }
}

module.exports = acfilehash()