docker build -t credentiallessxss .
docker run --init -p 3000:3000 credentiallessxss
