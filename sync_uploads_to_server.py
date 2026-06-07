"""
Script untuk menyalin folder uploads dari lokal ke server (192.168.1.51)
Menyalin semua folder di backend/uploads/ ke server via SFTP

Cara pakai:
  python sync_uploads_to_server.py
"""

import paramiko
import os
import sys

HOST = "192.168.1.51"
USER = "root"
PASSWORD = "it92528!@"
LOCAL_UPLOADS = os.path.join(os.path.dirname(__file__), "backend", "uploads")
REMOTE_UPLOADS = "/var/www/db_sas_annajah/backend/uploads"

def sync_directory(sftp, local_path, remote_path):
    """Salin semua file dari local_path ke remote_path, buat subfolder jika perlu."""
    if not os.path.exists(local_path):
        print(f"  [SKIP] {local_path} tidak ditemukan di lokal")
        return

    try:
        sftp.stat(remote_path)
    except FileNotFoundError:
        print(f"  [BUAT] {remote_path}")
        sftp.mkdir(remote_path)

    for item in os.listdir(local_path):
        local_item = os.path.join(local_path, item)
        remote_item = os.path.join(remote_path, item).replace("\\", "/")

        if os.path.isdir(local_item):
            # Buat folder remote
            try:
                sftp.stat(remote_item)
            except FileNotFoundError:
                print(f"  [BUAT] folder {remote_item}")
                sftp.mkdir(remote_item)
            # Rekursif
            sync_directory(sftp, local_item, remote_item)
        elif os.path.isfile(local_item):
            # Cek apakah file sudah ada di remote (skip jika sama)
            try:
                remote_stat = sftp.stat(remote_item)
                local_size = os.path.getsize(local_item)
                if remote_stat.st_size == local_size:
                    # print(f"  [SKIP] {item} (sudah ada)")
                    continue
            except FileNotFoundError:
                pass

            print(f"  [COPY] {item} -> {remote_item}")
            sftp.put(local_item, remote_item)

def main():
    print("=" * 60)
    print("  SYNC UPLOADS KE SERVER 192.168.1.51")
    print("=" * 60)
    print()

    if not os.path.exists(LOCAL_UPLOADS):
        print(f"ERROR: Folder lokal tidak ditemukan: {LOCAL_UPLOADS}")
        sys.exit(1)

    print(f"Lokal  : {LOCAL_UPLOADS}")
    print(f"Remote : {REMOTE_UPLOADS}")
    print()

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        print("Menghubungkan ke server...")
        client.connect(HOST, username=USER, password=PASSWORD, timeout=10)
        print("Terhubung!")
        print()

        sftp = client.open_sftp()

        # Sync semua subfolder uploads: guru, kehadiran-guru, siswa, logo, dll
        folders = ["guru", "kehadiran-guru", "siswa", "logo", "ppdb", "prestasi", "temp"]
        for folder in folders:
            local_dir = os.path.join(LOCAL_UPLOADS, folder)
            remote_dir = f"{REMOTE_UPLOADS}/{folder}"
            if os.path.exists(local_dir):
                print(f"\n📁 Folder: {folder}/")
                sync_directory(sftp, local_dir, remote_dir)
            else:
                print(f"\n📁 Folder: {folder}/ -> [tidak ada di lokal]")

        sftp.close()
        print()
        print("=" * 60)
        print("✅ SINKRONISASI SELESAI!")
        print("=" * 60)
        print()
        print("File foto sekarang sudah tersalin ke server.")
        print("Coba refresh halaman Kehadiran Guru — foto seharusnya sudah muncul.")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
