@echo off
echo ================================================================
echo   RUNNING GOTORO CINEMA AUTOMATED TEST SUITE (FULL STACK)
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
echo ================================================================
echo   [1/2] RUNNING BACKEND INTEGRATION TESTS (Maven Failsafe)
echo ================================================================
cd backend
call .\mvnw.cmd -B verify
if errorlevel 1 (
    echo.
    echo [ERROR] Backend integration/unit tests failed! Aborting test suite.
    cd ..
    exit /b 1
)
cd ..

echo.
echo ================================================================
echo   [2/2] RUNNING FRONTEND TEST SUITE (Vitest + Integration)
echo ================================================================
cd frontend
call npm run test:all
if errorlevel 1 (
    echo.
    echo [ERROR] Frontend test suite failed!
    cd ..
    exit /b 1
)
cd ..

echo.
echo ================================================================
echo   [SUCCESS] ALL TEST SUITES PASSED CLEANLY
echo ================================================================
