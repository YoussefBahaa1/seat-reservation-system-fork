FROM cypress/included:12.14.0

WORKDIR /e2e

COPY package.json ./package.json
RUN npm install
RUN mkdir cypress
COPY support cypress/support
COPY tls tls
COPY integration cypress/integration
COPY cypress.config.js ./cypress.config.js

ENTRYPOINT ["npx", "cypress", "run"]