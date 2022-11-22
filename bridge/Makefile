.PHONY: build
build:
	cargo-build-sbf

.PHONY: test
test:
	cargo-test-sbf -- --nocapture

.PHONY: deploy
deploy:
	solana program deploy ./target/deploy/test_bridge.so
