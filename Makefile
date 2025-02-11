MOCHA_OPTS= --slow 0 -A
REPORTER = spec

lint-fix:
	./node_modules/.bin/eslint --fix core.js index.js browser.js test/test.js

commit:
	@node ./node_modules/ac-semantic-release/lib/commit.js

release:
	@node ./node_modules/ac-semantic-release/lib/release.js

test-release:
	DEBUGMODE=true node ./node_modules/ac-semantic-release/lib/release.js

.PHONY: check
