@echo off
title MIST Local Daemon
echo ======================================================
echo           MIST LOCAL DAEMON - LAUNCHER NATIVO
echo ======================================================
echo.
echo Iniciando servico local de execucao de jogos em 127.0.0.1:39090...
echo.

if exist .venv\Scripts\python.exe (
    .venv\Scripts\python.exe runner\mist_daemon.py
) else (
    python runner\mist_daemon.py
)

pause
