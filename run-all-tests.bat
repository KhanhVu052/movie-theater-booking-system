@echo off
echo ================================================================
echo   RUNNING GOTORO CINEMA AUTOMATED TEST SUITE (FRONTEND + API)
echo ================================================================
echo.
if "%ADMIN_EMAIL%"=="" goto warn_missing_credentials
if "%ADMIN_PASSWORD%"=="" goto warn_missing_credentials
goto run_tests

:warn_missing_credentials
echo [INFO] ADMIN_EMAIL or ADMIN_PASSWORD is not set.
echo To run the full API QA suite against running backend, set:
echo   set ADMIN_EMAIL=admin@cinema.com
echo   set ADMIN_PASSWORD=YourPassword
echo   run-all-tests.bat
echo.

:run_tests
cd frontend
call npm run test:all
cd ..
echo.
echo ================================================================
echo   AUTOMATED TEST RUN COMPLETE
echo ================================================================
