FROM nginx:1.19-alpine
RUN ln -sf /usr/share/nginx/html/connectificator.html /usr/share/nginx/html/index.html
ADD connectificator/*.css /usr/share/nginx/html/
ADD connectificator/*.html /usr/share/nginx/html/
ADD connectificator/*.js /usr/share/nginx/html/
ADD http_redirect_to_https.conf /etc/nginx/conf.d/
ADD sneezy-webclient.conf /etc/nginx/conf.d/


EXPOSE 80 443
