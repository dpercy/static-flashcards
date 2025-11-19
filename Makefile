
# Here are a few helpful make targets:

help:
	@cat Makefile

install-hook:
	echo 'node sf.js' > .git/hooks/pre-commit


