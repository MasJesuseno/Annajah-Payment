import paramiko
import time

host = "192.168.1.51"
user = "root"
password = "it92528!@"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(host, username=user, password=password, timeout=10)
    print("=== CONNECTED ===")
    
    commands = [
        # Cloudflare tunnel details
        "cloudflared tunnel list 2>&1 || echo 'not configured'",
        "cloudflared tunnel info 2>&1 || echo 'no tunnel info'",
        "cat /root/.cloudflared/*.json 2>/dev/null || cat /etc/cloudflared/*.json 2>/dev/null || find / -name 'config.yml' -path '*cloudflared*' -exec cat {} \\; 2>/dev/null",
        "ps aux | grep cloudflared | grep -v grep",
        
        # PM2 apps (Node.js)
        "pm2 list 2>&1 || pm2 status 2>&1 || echo 'no pm2'",
        "cat /var/www/db_sas_annajah/backend/server.js | head -50",
        "cat /var/www/db_sas_annajah/backend/package.json | head -30",
        "ls -la /var/www/db_sas_annajah/",
        "ls -la /var/www/db_sas_annajah/frontend/",
        
        # Nginx full config
        "cat /etc/nginx/nginx.conf | head -60",
        "cat /etc/nginx/sites-available/sas_annajah",
        "ls /etc/nginx/sites-available/",
        
        # Check domains / DNS
        "cat /etc/hosts",
        "hostname -f 2>/dev/null",
        "hostname -A 2>/dev/null",
        "dig +short myip.opendns.com @resolver1.opendns.com 2>/dev/null || curl -s ifconfig.me 2>/dev/null || echo 'no public IP check'",
        
        # Check domain config in node app
        "grep -r 'server_name\\|domain\\|hostname\\|BASE_URL\\|APP_URL' /var/www/db_sas_annajah/backend/ --include='*.js' -l 2>/dev/null",
        "grep -r 'server_name\\|domain\\|hostname\\|BASE_URL\\|APP_URL' /var/www/db_sas_annajah/frontend/ --include='*.js' -l 2>/dev/null",
        
        # Check .env
        "cat /var/www/db_sas_annajah/backend/.env 2>/dev/null || echo 'no .env'",
        "cat /var/www/db_sas_annajah/frontend/.env 2>/dev/null || echo 'no .env'",
    ]
    
    for cmd in commands:
        stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        print(f"$ {cmd}")
        if out:
            print(out)
        if err:
            print(f"[stderr] {err}")
        print()
        time.sleep(0.3)

    client.close()
    print("=== DISCONNECTED ===")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
