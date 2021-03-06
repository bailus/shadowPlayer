#!/bin/bash

git config --global user.email "sam@bailey.geek.nz"
git config --global user.name "Bitbucket Pipelines"

VERSION=`python3 tools/getVersion.py`

git submodule init
git submodule update

npm install
./node_modules/.bin/jspm install
npm run build

git clone -b staging https://$USERNAME:$PASSWORD@bitbucket.org/bailus/kodi-addons.git
cd kodi-addons

rm -r webinterface.shadowPlayer
mv ../build/webinterface.shadowPlayer ./

git add .
git commit -m "webinterface.shadowPlayer updated using Bitbucket Pipelines (version: $VERSION)"
git push
