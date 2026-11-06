@echo off
set "DB_URL=jdbc:mysql://localhost:3307/cinema_booking_db?useSSL=false&serverTimezone=Asia/Ho_Chi_Minh&allowPublicKeyRetrieval=true&characterEncoding=UTF-8"
set "DB_USERNAME=root"
set "DB_PASSWORD="
set "JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970"
set "DEV_TOOLS_ENABLED=true"
set "BOOTSTRAP_ADMIN_EMAIL=admin@cinema.com"
set "BOOTSTRAP_ADMIN_PASSWORD=Admin123@Password"
cd backend
call mvnw.cmd spring-boot:run
