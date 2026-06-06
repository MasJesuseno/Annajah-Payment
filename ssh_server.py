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
        "hostname",
        "cat /etc/os-release",
        "uname -a",
        "echo '=== WEB SERVER ===",
        "which nginx && nginx -v 2>&1 || echo 'nginx not found'",
        "which apache2 && apache2 -v 2>&1 || echo 'apache2 not found'",
        "which httpd && httpd -v 2>&1 || echo 'httpd not found'",
        "dpkg -l 2>/dev/null | grep -iE '(apache|nginx|lighttpd|caddy)' | head -10",
        "ps aux | grep -iE '(apache|nginx|httpd|node|python|java|gunicorn|uwsgi|caddy)' | grep -v grep | head -10",
        "echo '=== LISTENING PORTS ===",
        "ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || netstat -an | grep LISTEN | head -20",
        "echo '=== ACTIVE SERVICES ===",
        "systemctl list-units --type=service --state=running 2>/dev/null | head -20",
        "echo '=== DOCUMENT ROOT ===",
        "find /var/www -maxdepth 2 -type d 2>/dev/null | head -10",
        "ls -la /etc/nginx/sites-enabled/ 2>/dev/null; cat /etc/nginx/sites-enabled/* 2>/dev/null | head -80",
        "ls -la /etc/apache2/sites-enabled/ 2>/dev/null; cat /etc/apache2/sites-enabled/*.conf 2>/dev/null | head -80",
        "echo '=== FIREWALL ===",
        "ufw status 2>/dev/null || iptables -L -n 2>/dev/null | head -20 || echo 'no firewall info'",
        "echo '=== SSL/TLS ===",
        "ls -la /etc/ssl/ 2>/dev/null | head -10",
        "ls -la /etc/letsencrypt/ 2>/dev/null || echo 'no letsencrypt'",
        "openssl version 2>/dev/null || echo 'openssl not found'",
        "echo '=== APPS ===",
        "ls -la /root/ 2>/dev/null | head -10",
        "ls -la /home/ 2>/dev/null | head -10",
        "hostname -I 2>/dev/null",
        "curl -s -o /dev/null -w 'localhost:80 -> HTTP %{http_code}' http://localhost:80 2>/dev/null; echo ''",
        "curl -s -o /dev/null -w 'localhost:443 -> HTTP %{http_code}' https://localhost:443 2>/dev/null; echo ''",
        "curl -s -o /dev/null -w 'localhost:3000 -> HTTP %{http_code}' http://localhost:3000 2>/dev/null; echo ''",
        "curl -s -o /dev/null -w 'localhost:8080 -> HTTP %{http_code}' http://localhost:8080 2>/dev/null; echo ''",
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
