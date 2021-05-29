# AC Filehash
Create a hash from a file. The source can be a local file or an URL.

This hash is created using 3 sections of the file - one at the beginning, one in the middle and one at the end. This way, a hash can be easily and fast created even for large files.

# Usage
```
const acfh = require('ac-filehash)

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

# TODO
+ make available in browser

## Links
- [Website](https://www.admiralcloud.com/)
- [Twitter (@admiralcloud)](https://twitter.com/admiralcloud)
- [Facebook](https://www.facebook.com/MediaAssetManagement/)

## License
[MIT License](https://opensource.org/licenses/MIT) Copyright © 2009-present, AdmiralCloud AG