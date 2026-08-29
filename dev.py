"""
dev.py - Runs the Flask backend and the Vite frontend together.

Usage:
    python dev.py

Place this file in your project root (same folder as app.py, next to the
'frontend' folder). Press Ctrl+C once to stop both servers.
"""

import subprocess
import sys
import os
import signal
import threading

# --- Paths (adjust if your folder names differ) ---
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

# On Windows, npm is actually npm.cmd
NPM_CMD = "npm.cmd" if os.name == "nt" else "npm"


def stream_output(process, prefix):
    """Reads a process's stdout line by line and prints it with a prefix."""
    for line in iter(process.stdout.readline, ""):
        if line:
            print(f"[{prefix}] {line.rstrip()}")
    process.stdout.close()


def main():
    print("Starting backend (Flask) and frontend (Vite)...\n")

    # Start Flask backend
    backend = subprocess.Popen(
        [sys.executable, "app.py"],
        cwd=ROOT_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    # Start Vite frontend
    frontend = subprocess.Popen(
        [NPM_CMD, "run", "dev"],
        cwd=FRONTEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    # Stream both processes' output concurrently
    t1 = threading.Thread(target=stream_output, args=(backend, "BACKEND"), daemon=True)
    t2 = threading.Thread(target=stream_output, args=(frontend, "FRONTEND"), daemon=True)
    t1.start()
    t2.start()

    try:
        # Wait until either process exits, or Ctrl+C is pressed
        while True:
            if backend.poll() is not None:
                print("\nBackend process exited.")
                break
            if frontend.poll() is not None:
                print("\nFrontend process exited.")
                break
    except KeyboardInterrupt:
        print("\nShutting down both servers...")
    finally:
        for proc in (backend, frontend):
            if proc.poll() is None:
                try:
                    proc.terminate()
                except Exception:
                    pass
        for proc in (backend, frontend):
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()


if __name__ == "__main__":
    main()
