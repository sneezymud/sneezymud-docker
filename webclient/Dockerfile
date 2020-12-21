FROM nginx:1.19-alpine
RUN ln -sf /usr/share/nginx/html/connectificator.html /usr/share/nginx/html/index.html
ADD connectificator/*.css /usr/share/nginx/html/static/
ADD connectificator/*.html /usr/share/nginx/html/
ADD connectificator/*.js /usr/share/nginx/html/static/

# TLS is done by ingress controller
EXPOSE 80
