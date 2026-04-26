@echo off
echo Installing dependencies...
pip install -r requirements.txt
echo.
echo Starting  backend...
echo Open http://localhost:8080 in your browser
echo.
python app.py
pause
