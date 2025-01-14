# AC Filehash
Create a hash from a file. The source can be a local file, ArrayBuffer, URL or an AWS s3 bucket/key.

This hash is created using 3 sections of the file - one at the beginning, one in the middle and one at the end. This way, a hash can be easily and fast created even for large files.

![example workflow](https://github.com/admiralcloud/ac-filehash/actions/workflows/node.js.yml/badge.svg) [![Codacy Badge](https://app.codacy.com/project/badge/Grade/4dabe74bfb954f419ca992d65ddd8212)](https://app.codacy.com/gh/AdmiralCloud/ac-filehash/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)


# Usage
## NodeJs

### From local file
```javascript
const acfh = require('ac-filehash')

let test = async () => {
  let result = await acfh.getHash({ 
    filePath: './test/BigBuckBunny.mp4'
  })
  // RESPONSE
  {
    error: undefined,
    type: 'file',
    hash: 'f9ccc07b4959f5698fd30913743aacd5',
    fileSize: 158008374
  }
}
test()
```
### From URL
```javascript
const acfh = require('ac-filehash')

let test = async () => {
  let result = await acfh.getHash({ 
    url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  })
  // RESPONSE
  {
    error: undefined,
    type: 'url',
    hash: 'f9ccc07b4959f5698fd30913743aacd5',
    fileSize: 158008374
  }
}
test()
```

### From AWS S3
If no credentials are sent, the one's from your local AWS configuration are used. 

```javascript
const acfh = require('ac-filehash')

let test = async () => {
  let result = await acfh.getHash({
    bucket: 'mybucket',
    key: 'mykey',
    // optional credentials
    credentials: {
      accessKeyId: 'ABC',
      secretAccessKey: 'SECRET',
      // optional session token if you are using temporary credentials
      sessionToken: 'token'
    }
  })
  // RESPONSE
  {
    error: undefined,
    type: 's3',
    hash: 'f9ccc07b4959f5698fd30913743aacd5',
    fileSize: 158008374
  }

 
}
test()
```

## Browser
```javascript
const acfh = require('ac-filehash/browser')

const params = {
  url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
}

let test = async () => {
  let result = await acfh.getHash({ 
    url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  })
  // RESPONSE
  {
    error: undefined,
    type: 'url',
    hash: 'f9ccc07b4959f5698fd30913743aacd5',
    fileSize: 158008374
  }

  let result = await acfh.getHash({ 
    buffer: some_ArrayBuffer //<- e.g. ArrayBuffer generated from file through input field
  })
  // RESPONSE
  {
    error: undefined,
    type: 'buffer',
    hash: 'f9ccc07b4959f5698fd30913743aacd5',
    fileSize: 158008374
  }
}
test()
```

## Links
- [Website](https://www.admiralcloud.com/)

## License
[MIT License](https://opensource.org/licenses/MIT) Copyright © 2009-present, AdmiralCloud AG