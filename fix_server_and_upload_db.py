"""
Script to fix server and upload database.
Uses direct SSH commands without complex print output.
"""
import paramiko
import os
import sys
import subprocess
import time

HOST = "192.168.1.51"
USER = "root"
PASSWORD = "it92528!@"
APP_DIR = "/var/www/db_sas_annajah"
LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

def run_ssh_and_log(cmd, client, label=""):
    """Run a command and return output as string (no print issues)"""
    try:
        stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        result = []
        if label:
            result.append(f"--- {label} ---")
        result.append(f"$ {cmd}")
        if out:
            result.append(out[:500])
        if err:
            result.append(f"[err] {err[:200]}")
        result.append(f"[exit: {exit_status}]")
        return "\n".join(result)
    except Exception as e:
        return f"[ERROR] {e}"

def main():
    # Log all output to file to avoid encoding issues
    log_file = os.path.join(LOCAL_DIR, "deploy_log.txt")
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print("Connecting to server...")
        client.connect(HOST, username=USER, password=PASSWORD, timeout=10)
        print("Connected!\n")
        
        logs = []
        
        # Step 1: Fix PM2 - kill old processes, start fresh
        print("Step 1/4: Fixing PM2 processes...")
        cmds = [
            # Kill old node processes by PID
            ("kill -9 615 2>/dev/null; kill -9 1527643 2>/dev/null; kill -9 1527590 2>/dev/null; echo 'Old processes killed'", "Kill old node"),
            # Delete all PM2 instances
            ("pm2 delete backend-sas 2>/dev/null; pm2 save --force 2>/dev/null; echo 'PM2 cleaned'", "Clean PM2"),
            ("pm2 delete backend-sas 2>/dev/null; pm2 save --force 2>/dev/null; echo 'PM2 double cleaned'", "Clean PM2 again"),
            ("sleep 2", "Wait"),
            # Start fresh
            (f"cd {APP_DIR}/backend && pm2 start server.js --name backend-sas --update-env 2>&1 | tail -5", "Start fresh"),
            ("pm2 save --force 2>&1", "Save PM2"),
            ("sleep 3", "Wait for startup"),
            ("pm2 list 2>&1 | head -8", "Verify PM2"),
            ("ss -tlnp | grep 5000", "Verify port 5000"),
        ]
        for cmd, label in cmds:
            result = run_ssh_and_log(cmd, client, label)
            logs.append(result)
            # Print first line only
            first_line = result.split("\n")[0] if result else ""
            last_line = result.split("\n")[-1] if result else ""
            if "kill" in cmd:
                print(f"  {first_line}")
            else:
                print(f"  {last_line}")
            time.sleep(0.5)
        
        # Step 2: Fix role_permissions
        print("\nStep 2/4: Inserting role permissions...")
        cmds2 = [
            ("""mysql -u root -p'$a$Login4dmin' dbannajah -e "
                SELECT COUNT(*) as total FROM role_permissions 
                WHERE menu_path LIKE '/pengaturan-tv%' AND role='admin';
            " 2>&1""", "Check existing"),
            ("""mysql -u root -p'$a$Login4dmin' dbannajah -e "
                INSERT IGNORE INTO role_permissions (role, menu_path, can_access) VALUES
                ('admin', '/pengaturan-tv/agenda', 1),
                ('admin', '/pengaturan-tv/kata-bijak', 1),
                ('admin', '/pengaturan-tv/video', 1),
                ('bendahara', '/pengaturan-tv/agenda', 0),
                ('bendahara', '/pengaturan-tv/kata-bijak', 0),
                ('bendahara', '/pengaturan-tv/video', 0),
                ('guru', '/pengaturan-tv/agenda', 0),
                ('guru', '/pengaturan-tv/kata-bijak', 0),
                ('guru', '/pengaturan-tv/video', 0);
                SELECT 'INSERT OK' as status;
            " 2>&1""", "Insert permissions"),
            ("""mysql -u root -p'$a$Login4dmin' dbannajah -e "
                SELECT menu_path, role, can_access FROM role_permissions 
                WHERE menu_path LIKE '/pengaturan-tv%' ORDER BY role, menu_path;
            " 2>&1""", "Verify permissions"),
        ]
        for cmd, label in cmds2:
            result = run_ssh_and_log(cmd, client, label)
            logs.append(result)
            # Show last line of result
            lines = result.split("\n")
            for l in lines[-3:]:
                if l and not l.startswith("[exit:") and not l.startswith("$ ") and not l.startswith("---"):
                    print(f"  {l}")
            time.sleep(0.5)
        
        # Step 3: Upload database
        print("\nStep 3/4: Uploading database...")
        try:
            # Dump local database
            result = subprocess.run(
                ["mysqldump", "-u", "root", "--databases", "dbannajah"],
                capture_output=True, text=True, timeout=120
            )
            if result.returncode == 0 and len(result.stdout) > 100:
                sql_file = os.path.join(LOCAL_DIR, "db_dump_local.sql")
                with open(sql_file, "w", encoding="utf-8") as f:
                    f.write(result.stdout)
                print(f"  Local DB dumped: {len(result.stdout)} bytes")
                
                # Upload via SFTP
                sftp = client.open_sftp()
                remote_sql = f"{APP_DIR}/db_dump_local.sql"
                sftp.put(sql_file, remote_sql)
                sftp.close()
                print(f"  Uploaded to server")
                
                # Import on server
                result2 = run_ssh_and_log(
                    f"mysql -u root -p'$a$Login4dmin' dbannajah < {APP_DIR}/db_dump_local.sql 2>&1 && echo 'IMPORT OK'",
                    client, "Import DB"
                )
                logs.append(result2)
                if "IMPORT OK" in result2:
                    print("  Database imported successfully on server!")
                else:
                    print(f"  Import result: {result2.split(chr(10))[-2] if chr(10) in result2 else result2}")
                
                # Verify TV tables
                result3 = run_ssh_and_log(
                    """mysql -u root -p'$a$Login4dmin' dbannajah -e "
                        SELECT 'tv_video' as tbl, COUNT(*) as cnt FROM tv_video
                        UNION ALL SELECT 'tv_agenda', COUNT(*) FROM tv_agenda
                        UNION ALL SELECT 'tv_kata_bijak', COUNT(*) FROM tv_kata_bijak;
                    " 2>&1""",
                    client, "Verify TV data"
                )
                logs.append(result3)
                for line in result3.split("\n"):
                    if "tv_" in line and "cnt" not in line.lower():
                        print(f"  {line}")
                
                # Cleanup
                run_ssh_and_log(f"rm -f {APP_DIR}/db_dump_local.sql", client, "Cleanup")
                os.remove(sql_file)
                print("  Cleanup done")
            else:
                print(f"  Cannot dump local DB: {result.stderr[:200]}")
                print("  (Skipping database upload)")
        except FileNotFoundError:
            print("  mysqldump not found locally (skipping database upload)")
        
        # Step 4: Final verification
        print("\nStep 4/4: Verifying...")
        cmds4 = [
            ("pm2 list 2>&1 | head -8", "PM2 status"),
            ("curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/pengaturan-tv/display && echo ' - API display OK'", "API test"),
            ("curl -s -o /dev/null -w '%{http_code}' http://localhost:80/ && echo ' - Frontend OK'", "Frontend test"),
            ("curl -s -o /dev/null -w '%{http_code}' http://localhost:80/login && echo ' - Login page OK'", "Login test"),
        ]
        for cmd, label in cmds4:
            result = run_ssh_and_log(cmd, client, label)
            logs.append(result)
            for line in result.split("\n"):
                if "OK" in line or "online" in line or "online" in line.lower():
                    print(f"  {line}")
            time.sleep(0.5)
        
        # Save log
        with open(log_file, "w", encoding="utf-8") as f:
            f.write("\n\n".join(logs))
        
        print(f"\n{'='*50}")
        print("ALL DONE!")
        print(f"{'='*50}")
        print(f"\nLog saved to: {log_file}")
        print("\nAccess:")
        print("  http://192.168.1.51/  (Admin app)")
        print("  http://192.168.1.51/TV  (TV Display)")
        
    except Exception as e:
        print(f"\nERROR: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    main()
