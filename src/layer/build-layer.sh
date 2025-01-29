#!/bin/bash

VERSION="python3.12"
PYTHON_LIB="PyMysql redis requests ipaddress"
API_URL="http://cloudperf.tansoft.org/job"

TMP_PATH=$(mktemp -d)

docker run -v ${TMP_PATH}:/var/task "public.ecr.aws/sam/build-${VERSION}" /bin/sh -c "dnf -y install glibc-static libstdc++-static;git clone https://github.com/tansoft/fping;cd fping;./autogen.sh;./configure --enable-centralmode='${API_URL}';make;cd ..;mv fping/src/fping fping-lambda;pip install -t python/lib/${VERSION}/site-packages/ ${PYTHON_LIB};rm -rf python/lib/${VERSION}/site-packages/*dist-info; exit"

(
    cd ${TMP_PATH}
    zip -r9 fping-layer.zip fping-lambda
    zip -r9 pythonlib-layer.zip python
)

mv ${TMP_PATH}/*.zip .
sudo rm -rf ${TMP_PATH}
