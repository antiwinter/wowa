#!/bin/bash

V=`cat package.json | grep version | cut -d "\"" -f 4`
git tag -a $V -m "$V" 
git push origin $V
npm publish
