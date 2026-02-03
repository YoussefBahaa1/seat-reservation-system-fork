# --- Stage 1: Builder ---
FROM node:22-slim AS builder
ENV NODE_ENV=production

WORKDIR /usr/src/app

############################################################################
# Important to define variables for build time, not just run time          #
# E.g.: process.env.REACT_APP_BACKEND_URL will be substituted at buildtime #
############################################################################
ARG REACT_APP_CREATE_SERIES_DEFAULT_STARTTIME
ENV REACT_APP_CREATE_SERIES_DEFAULT_STARTTIME=$REACT_APP_CREATE_SERIES_DEFAULT_STARTTIME

ARG REACT_APP_CREATE_SERIES_DEFAULT_ENDTIME
ENV REACT_APP_CREATE_SERIES_DEFAULT_ENDTIME=$REACT_APP_CREATE_SERIES_DEFAULT_ENDTIME

ARG REACT_APP_CREATE_SERIES_DEFAULT_FREQUENCY
ENV REACT_APP_CREATE_SERIES_DEFAULT_FREQUENCY=$REACT_APP_CREATE_SERIES_DEFAULT_FREQUENCY

ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

ARG REACT_APP_ERROR_USER_NOT_FOUND_IN_AD
ENV REACT_APP_ERROR_USER_NOT_FOUND_IN_AD=$REACT_APP_ERROR_USER_NOT_FOUND_IN_AD

ARG REACT_APP_ERROR_USER_NOT_FOUND_IN_DAO
ENV REACT_APP_ERROR_USER_NOT_FOUND_IN_DAO=$REACT_APP_ERROR_USER_NOT_FOUND_IN_DAO

ARG REACT_APP_ERROR_WRONG_PW
ENV REACT_APP_ERROR_WRONG_PW=$REACT_APP_ERROR_WRONG_PW
ARG REACT_APP_ERROR_USER_DEACTIVATED
ENV REACT_APP_ERROR_USER_DEACTIVATED=$REACT_APP_ERROR_USER_DEACTIVATED

ARG TARGET

# Copy needed packages.
COPY package.json package-lock.json* ./
# Proxy stuff to install packages
RUN npm config set registry http://registry.npmjs.org/
# RUN npm config set https-proxy http://proxy.justiz.sachsen.de:3128
# RUN npm config set proxy http://proxy.justiz.sachsen.de:3128

# Dependencies installing
RUN npm ci --omit=dev

# Cp source
COPY public public
COPY src src

RUN if [ "$TARGET" = "production_runtime" ]; then \
        npm run build; \
    fi

# Small image to serve the builded bundle
FROM nginx:alpine AS production_runtime
ARG REACT_APP_CREATE_SERIES_DEFAULT_STARTTIME
ENV REACT_APP_CREATE_SERIES_DEFAULT_STARTTIME=$REACT_APP_CREATE_SERIES_DEFAULT_STARTTIME

ARG REACT_APP_CREATE_SERIES_DEFAULT_ENDTIME
ENV REACT_APP_CREATE_SERIES_DEFAULT_ENDTIME=$REACT_APP_CREATE_SERIES_DEFAULT_ENDTIME

ARG REACT_APP_CREATE_SERIES_DEFAULT_FREQUENCY
ENV REACT_APP_CREATE_SERIES_DEFAULT_FREQUENCY=$REACT_APP_CREATE_SERIES_DEFAULT_FREQUENCY

ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

ARG REACT_APP_ERROR_USER_NOT_FOUND_IN_AD
ENV REACT_APP_ERROR_USER_NOT_FOUND_IN_AD=$REACT_APP_ERROR_USER_NOT_FOUND_IN_AD

ARG REACT_APP_ERROR_USER_NOT_FOUND_IN_DAO
ENV REACT_APP_ERROR_USER_NOT_FOUND_IN_DAO=$REACT_APP_ERROR_USER_NOT_FOUND_IN_DAO

ARG REACT_APP_ERROR_WRONG_PW
ENV REACT_APP_ERROR_WRONG_PW=$REACT_APP_ERROR_WRONG_PW
ARG REACT_APP_ERROR_USER_DEACTIVATED
ENV REACT_APP_ERROR_USER_DEACTIVATED=$REACT_APP_ERROR_USER_DEACTIVATED

ARG REACT_APP_USE_TLS
ENV REACT_APP_USE_TLS=$REACT_APP_USE_TLS

# The config for https etc.
COPY nginx.tls.conf /etc/nginx/nginx.tls.conf
# The config without https etc.
COPY nginx.notls.conf /etc/nginx/nginx.notls.conf

COPY myentrypoint.sh /myentrypoint.sh
RUN sed -i 's/\r$//' /myentrypoint.sh && chmod +x /myentrypoint.sh

# Builded react file will be served as static site by nginx.
COPY --from=builder /usr/src/app/build /usr/share/nginx/html

#CMD ["nginx", "-g", "daemon off;"]
ENTRYPOINT ["/myentrypoint.sh"]

