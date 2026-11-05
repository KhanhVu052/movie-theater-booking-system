@echo off
echo ================================================================
echo   RUNNING GOTORO CINEMA AUTOMATED TEST SUITE (FRONTEND + API)
echo ================================================================
echo.
cd frontend
call npm run test:all
cd ..
echo.
echo ================================================================
echo   AUTOMATED TEST RUN COMPLETE
echo ================================================================
