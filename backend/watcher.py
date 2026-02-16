import time
import re
import subprocess
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from threading import Timer

from app.logging_config import configure_logging, get_logger

# Updated regex to include main.py, schemas.py, and all .py files in app/routes
WATCHER_REGEX_PATTERN = re.compile(r"(main\.py|schemas\.py|routes/.*\.py)$")
APP_PATH = "app"

configure_logging()
logger = get_logger(__name__)


class MyHandler(FileSystemEventHandler):
    def __init__(self):
        super().__init__()
        self.debounce_timer = None
        self.last_modified = 0

    def on_modified(self, event):
        if not event.is_directory and WATCHER_REGEX_PATTERN.search(
            os.path.relpath(event.src_path, APP_PATH)
        ):
            current_time = time.time()
            if current_time - self.last_modified > 1:
                self.last_modified = current_time
                if self.debounce_timer:
                    self.debounce_timer.cancel()
                self.debounce_timer = Timer(1.0, self.execute_command, [event.src_path])
                self.debounce_timer.start()

    def execute_command(self, file_path):
        logger.info("File %s has been modified and saved.", file_path)
        self.run_mypy_checks()
        self.run_openapi_schema_generation()

    def run_mypy_checks(self):
        """Run mypy type checks and print output."""
        logger.info("Running mypy type checks...")
        result = subprocess.run(
            ["uv", "run", "mypy", "app"],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.stdout.strip():
            logger.info(result.stdout.strip())
        if result.stderr.strip():
            logger.error(result.stderr.strip())
        if result.returncode:
            logger.warning(
                "Type errors detected! We recommend checking the mypy output for more details."
            )
        else:
            logger.info("No type errors detected.")

    def run_openapi_schema_generation(self):
        """Run the OpenAPI schema generation command."""
        logger.info("Proceeding with OpenAPI schema generation...")
        try:
            subprocess.run(
                [
                    "uv",
                    "run",
                    "python",
                    "-m",
                    "commands.generate_openapi_schema",
                ],
                check=True,
            )
            logger.info("OpenAPI schema generation completed successfully.")
        except subprocess.CalledProcessError as e:
            logger.error("An error occurred while generating OpenAPI schema: %s", e)


if __name__ == "__main__":
    observer = Observer()
    observer.schedule(MyHandler(), APP_PATH, recursive=True)
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
