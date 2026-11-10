@echo off
cd /d "%~dp0"
node flush-line-queue.js >> line-flush.log 2>&1
