
@echo off
echo Cleaning Next.js cache...
rmdir /s /q .next
echo Starting development server...
npm run dev
pause
