#!/bin/bash

VERSION="3.12"
# 需要分别在 x86_64 和 arm64 机器上运行docker，得到两个库
PYTHON_LIB="PyMysql redis requests"
ARCHS="x86_64 arm64"

TMP_PATH=$(mktemp -d)

for ARCH in ${ARCHS}; do
    mkdir ${TMP_PATH}/${ARCH}
    docker run -v ${TMP_PATH}/${ARCH}:/var/task "public.ecr.aws/sam/build-python${VERSION}:latest-${ARCH}" /bin/sh -c "pip install -t python/lib/python${VERSION}/site-packages/ ${PYTHON_LIB};rm -rf python/lib/python${VERSION}/site-packages/*dist-info; exit"

    (
        cd ${TMP_PATH}/${ARCH}
        zip -r9 ../pythonlib-layer-${ARCH}.zip python
    )
done

mv ${TMP_PATH}/pythonlib-layer-*.zip .
rm -rf ${TMP_PATH}
