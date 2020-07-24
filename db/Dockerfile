FROM alpine:3.12 as git
RUN apk update && apk add git
ARG UID=1000
RUN adduser -Du $UID sneezy
USER sneezy
WORKDIR /home/sneezy
RUN git clone --depth 1 https://github.com/sneezymud/sneezymud

FROM mariadb:10.5
ENV MYSQL_ROOT_PASSWORD "111111"
ENV MYSQL_USER sneezy
ENV MYSQL_PASSWORD password
ADD ./my.cnf /etc/mysql/my.cnf
RUN chmod 600 /etc/mysql/my.cnf
ADD ./init.sql /docker-entrypoint-initdb.d/init.sql
ADD ./setup_mysql.sh /docker-entrypoint-initdb.d/setup_mysql.sh
COPY --from=git /home/sneezy/sneezymud/_Setup-data /home/sneezy/_Setup-data
