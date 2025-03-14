#!/bin/bash

basepath=$(cd `dirname "${BASH_SOURCE[0]}"`;cd ..;pwd)
cd $(basepath)/src/web && rm -rf lambda/app/public/* && npm run build -- --mode production
