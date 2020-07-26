# Rocket.Chat.App-IGDB [CURRENTLY BROKEN]

CURRENTLY BROKEN - issue with requests going to API coming back static ids 1-9

Interact with the IGDB Api.

## Configuration

> Create an IGDB application at https://api-docs.igdb.com

Other Settings include:

### API Key
API Key of your created IGDB application.

## Docker
A Dockerfile and docker-compose are provided.

Build the docker image and run it to deploy to your server:
`docker build -t rocketchatapp_igdb . && docker run -it --rm -e URL=YOUR_SERVER -e USERNAME=YOUR_USERNAME -e PASSWORD=YOUR_PASSWORD rocketchatapp_igdb`

Build the docker image and run docker-compose to deploy to your server:
`docker build -t rocketchatapp_igdb . && docker-compose run --rm -e URL=YOUR_SERVER -e USERNAME=YOUR_USERNAME -e PASSWORD=YOUR_PASSWORD rocketchatapp_igdb`