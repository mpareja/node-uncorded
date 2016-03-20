FROM iron/node:4

RUN addgroup service && adduser -S -G service service

COPY ./ /home/service/app
WORKDIR /home/service/app
RUN chown -R service:service /home/service/app

CMD node api
