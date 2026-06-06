import paramiko
import time
import sys
import io

# Fix encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

host = "192.168.1.51"
user = "root"
password = "it92528!@"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(host, username=user, password=password, timeout=10, allow_agent=False, look_for_keys=False)
    
    def run_cmd(cmd):
        stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        return out, err

    # PM2 list
    out, err = run_cmd("pm2 list --no-color 2>&1 || pm2 status --no-color 2>&1 || echo 'pm2 not available'")
    print("=== PM2 ===")
    print(out[:800])
    print()
    
    # Full nginx site config
    out, err = run_cmd("cat /etc/nginx/sites-available/sas_annajah")
    print("=== NGINX SITE CONFIG ===")
    print(out)
    print()
    
    # Main nginx config
    out, err = run_cmd("cat /etc/nginx/nginx.conf")
    print("=== NGINX MAIN CONFIG ===")
    print(out[:2000])
    print()
    
    # Backend env
    out, err = run_cmd("cat /var/www/db_sas_annajah/backend/.env 2>/dev/null || echo 'no .env'")
    print("=== BACKEND .ENV ===")
    print(out[:2000])
    print()
    
    # Frontend env
    out, err = run_cmd("cat /var/www/db_sas_annajah/frontend/.env 2>/dev/null || echo 'no .env'")
    print("=== FRONTEND .ENV ===")
    print(out[:2000])
    print()
    
    # hosts
    out, err = run_cmd("cat /etc/hosts")
    print("=== HOSTS ===")
    print(out)
    print()
    
    # Domain
    out, err = run_cmd("hostname -f 2>/dev/null; hostname -A 2>/dev/null")
    print("=== DOMAIN ===")
    print(out)
    print()
    
    # cloudflared process details
    out, err = run_cmd("cat /proc/5955/cmdline 2>/dev/null | tr '\\0' ' ' || echo 'Cannot read cmdline'")
    print("=== CLOUDFLARED CMDLINE ===")
    print(out[:500])
    print()
    
    # API config
    out, err = run_cmd("cat /var/www/db_sas_annajah/frontend/src/api/index.js 2>/dev/null | head -30")
    print("=== API INDEX ===")
    print(out[:1000])
    print()
    
    # Server.js
    out, err = run_cmd("head -40 /var/www/db_sas_annajah/backend/server.js 2>/dev/null")
    print("=== SERVER.JS (head) ===")
    print(out[:2000])
    print()
    
    # Check port 5000 backend
    out, err = run_cmd("curl -s -o /dev/null -w 'port 5000 -> HTTP %{http_code}' http://127.0.0.1:5000/ 2>/dev/null; echo ''")
    print("=== BACKEND CHECK ===")
    print(out)
    print()
    
    # Check what domains the app uses
    out, err = run_cmd("grep -r 'domain\\|BASE_URL\\|APP_URL\\|API_URL\\|VITE_API' /var/www/db_sas_annajah --include='*.js' --include='*.env' --include='*.json' -h 2>/dev/null | grep -v node_modules | head -20")
    print("=== DOMAIN CONFIGS ===")
    print(out[:1000])
    print()

    client.close()

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
