const fs = require('fs')
const crypto = require('crypto')

const FILE_SIZE = 788493
const FILE_PATH = './test/testfile.mp4'

// deterministic pseudo random content
const createContent = (size = FILE_SIZE) => {
  const buffer = Buffer.alloc(size)
  let offset = 0
  let counter = 0
  while (offset < size) {
    const block = crypto.createHash('sha256').update(String(counter++)).digest()
    offset += block.copy(buffer, offset)
  }
  return buffer
}

if (require.main === module) {
  fs.writeFileSync(FILE_PATH, createContent())
  console.log(`Local test file created -> ${FILE_PATH}`)
}

module.exports = { createContent, FILE_SIZE, FILE_PATH }
