const crypto = require('crypto')
const fs = require('fs')
const axios = require('axios')
const { S3Client, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
const { TIMEOUT, validateUrl, createHasher } = require('./core')

const implementation = {
  createHash() {
    return crypto.createHash('MD5')
  },

  updateHash(hash, chunk) {
    hash.update(chunk)
  },

  finalizeHash(hash) {
    return hash.digest('hex')
  },

  async getFileSize({ url, s3, filePath }) {
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

    if (s3) {
      const region = s3?.region || 'eu-central-1'
      const client = new S3Client({
        region,
        credentials: s3.credentials,
      })
      const command = new HeadObjectCommand({
        Bucket: s3?.bucket,
        Key: s3?.key,
      })
      const response = await client.send(command)
      return {
        fileSize: response.ContentLength,
        contentType: response.ContentType,
      }
    }

    if (filePath) {
      const stats = fs.statSync(filePath)
      return { fileSize: stats.size }
    }

    throw new Error('noSourceSet')
  },

  async loadChunk({ url, s3, filePath, start, end }) {
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

    if (s3) {
      const region = s3?.region || 'eu-central-1'
      const client = new S3Client({
        region,
        credentials: s3.credentials,
      })
      const command = new GetObjectCommand({
        Bucket: s3?.bucket,
        Key: s3?.key,
        Range: `bytes=${start}-${end - 1}`,
      })
      const { Body } = await client.send(command)
      return await streamToBuffer(Body)
    }

    if (filePath) {
      const length = end - start
      const buffer = Buffer.alloc(length)
      const fd = fs.openSync(filePath, 'r')
      fs.readSync(fd, buffer, 0, length, start)
      fs.closeSync(fd)
      return buffer
    }

    throw new Error('noSourceSet')
  }
}

// Helper function for S3 streams
const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })

module.exports = createHasher(implementation)