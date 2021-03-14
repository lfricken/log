set URL="postgres://%USERNAME%:pass@127.0.0.1:5432/local"
setx DATABASE_URL %URL%
setx DATABASE_SKIPSSL "true"
