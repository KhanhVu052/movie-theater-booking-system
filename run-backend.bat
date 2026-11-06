@echo off
if not exist .env (
  echo [ERROR] Khong tim thay file .env! Vui long tao file .env tu .env.example truoc khi chay.
  exit /b 2
)
for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do set "%%a=%%b"
cd backend
call mvnw.cmd spring-boot:run
