build:
	docker build --no-cache -t ziqiancheng/funceasy-api:latest -f ./Dockerfile .
	docker push ziqiancheng/funceasy-api