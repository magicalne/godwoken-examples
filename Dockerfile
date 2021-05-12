FROM nervos/godwoken-prebuilds:v0.2.0-rc2

WORKDIR "/godwoken-examples"

RUN apt-get update \
 && apt-get dist-upgrade -y \
 && apt-get clean \
 && echo "Finished installing dependencies"

COPY package*.json ./
COPY packages/client/package*.json ./packages/client/
COPY packages/godwoken/package*.json ./packages/godwoken/
COPY packages/polyjuice/package*.json ./packages/polyjuice/
COPY packages/runner/package*.json ./packages/runner/
RUN yarn install

COPY --chown=node . ./

EXPOSE 6100
EXPOSE 6100

USER node
CMD ["node", "version"]