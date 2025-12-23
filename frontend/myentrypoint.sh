#!/bin/sh
if [ "$REACT_APP_USE_TLS" = "true" ]; then
    cp /etc/nginx/nginx.tls.conf /etc/nginx/conf.d/default.conf
else
    cp /etc/nginx/nginx.notls.conf /etc/nginx/conf.d/default.conf
fi

exec nginx -g "daemon off;"