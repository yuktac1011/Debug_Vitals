"""
Unit tests for the event normaliser subfeatures.
Tests agent_activity/capture.py, git_watcher/diff_parser.py, env_scanner/scanner.py.
Pure functions — no I/O.
"""

import pytest
from app.features.events.subfeatures.agent_activity.capture import normalise_agent_action
from app.features.events.subfeatures.git_watcher.diff_parser import normalise_git_diff
from app.features.events.subfeatures.env_scanner.scanner import normalise_env_snapshot


class TestAgentActionCapture:
    def test_basic_tool_call(self):
        payload = {
            "tool_name": "str_replace_editor",
            "path": "backend/app/main.py",
            "outcome": "success",
        }
        result = normalise_agent_action(payload)
        assert result["action_type"] == "file_edit"
        assert result["tool_name"] == "str_replace_editor"
        assert result["target"] == "backend/app/main.py"
        assert result["outcome"] == "success"
        assert result["raw"] == payload

    def test_shell_command_type_detection(self):
        payload = {"tool_name": "bash", "command": "pytest tests/", "outcome": "failure"}
        result = normalise_agent_action(payload)
        assert result["action_type"] == "shell_command"
        assert result["target"] == "pytest tests/"

    def test_unknown_tool_defaults_to_other(self):
        payload = {"tool_name": "some_custom_tool_xyz", "outcome": "success"}
        result = normalise_agent_action(payload)
        assert result["action_type"] == "other"

    def test_invalid_outcome_normalised_to_unknown(self):
        payload = {"tool_name": "bash", "outcome": "SOME_WEIRD_STATUS"}
        result = normalise_agent_action(payload)
        assert result["outcome"] == "unknown"

    def test_error_message_extracted(self):
        payload = {"tool_name": "bash", "error": "command not found: foo"}
        result = normalise_agent_action(payload)
        assert result["error_message"] == "command not found: foo"

    def test_long_target_truncated(self):
        long_path = "a/" * 3000
        payload = {"tool_name": "read_file", "path": long_path}
        result = normalise_agent_action(payload)
        assert len(result["target"]) <= 4096

    def test_non_string_tool_name_handled(self):
        """Should not raise — gracefully handles type mismatches."""
        payload = {"tool_name": 42}
        result = normalise_agent_action(payload)
        assert result is not None

    def test_raw_preserved(self):
        payload = {"tool_name": "bash", "command": "ls", "extra_key": "extra_val"}
        result = normalise_agent_action(payload)
        assert result["raw"]["extra_key"] == "extra_val"


class TestGitDiffParser:
    SAMPLE_DIFF = """\
diff --git a/app/main.py b/app/main.py
index abc123..def456 100644
--- a/app/main.py
+++ b/app/main.py
@@ -10,7 +10,9 @@
 import os
-import sys
+import sys
+import logging
 
 def main():
     pass
diff --git a/tests/test_main.py b/tests/test_main.py
new file mode 100644
--- /dev/null
+++ b/tests/test_main.py
@@ -0,0 +1,5 @@
+import pytest
+
+def test_placeholder():
+    assert True
"""

    def test_parses_two_files(self):
        result = normalise_git_diff({"diff": self.SAMPLE_DIFF})
        assert len(result["files_changed"]) == 2

    def test_file_paths_extracted(self):
        result = normalise_git_diff({"diff": self.SAMPLE_DIFF})
        paths = [f["path"] for f in result["files_changed"]]
        assert "app/main.py" in paths

    def test_new_file_detected(self):
        result = normalise_git_diff({"diff": self.SAMPLE_DIFF})
        new_file = next(f for f in result["files_changed"] if "test_main" in f["path"])
        assert new_file["change_type"] == "added"

    def test_additions_counted(self):
        result = normalise_git_diff({"diff": self.SAMPLE_DIFF})
        main_file = next(f for f in result["files_changed"] if "main.py" in f["path"] and "test" not in f["path"])
        assert main_file["additions"] >= 1

    def test_commit_sha_extracted(self):
        result = normalise_git_diff({"diff": self.SAMPLE_DIFF, "commit_sha": "abc1234"})
        assert result["commit_sha"] == "abc1234"

    def test_invalid_sha_ignored(self):
        result = normalise_git_diff({"diff": self.SAMPLE_DIFF, "commit_sha": "not-a-sha!"})
        assert result["commit_sha"] is None

    def test_structured_files_format(self):
        payload = {
            "files": [
                {"filename": "foo.py", "status": "M", "additions": 5, "deletions": 2},
                {"filename": "bar.py", "status": "A", "additions": 10, "deletions": 0},
            ]
        }
        result = normalise_git_diff(payload)
        assert len(result["files_changed"]) == 2
        assert result["files_changed"][1]["change_type"] == "added"
        assert result["total_additions"] == 15

    def test_empty_payload_returns_empty_files(self):
        result = normalise_git_diff({})
        assert result["files_changed"] == []
        assert result["total_additions"] == 0

    def test_raw_preserved(self):
        payload = {"diff": self.SAMPLE_DIFF, "extra": "data"}
        result = normalise_git_diff(payload)
        assert result["raw"]["extra"] == "data"


class TestEnvScanner:
    def test_basic_snapshot(self):
        payload = {
            "runtime": {"language": "python", "version": "3.11.6"},
            "packages": [{"name": "fastapi", "version": "0.110.0"}],
            "env_vars": {"HOME": "/root", "PATH": "/usr/bin"},
            "os": {"name": "Linux", "version": "5.15", "arch": "x86_64"},
        }
        result = normalise_env_snapshot(payload)
        assert result["runtime"]["language"] == "python"
        assert result["runtime"]["version"] == "3.11.6"
        assert any(p["name"] == "fastapi" for p in result["packages"])
        assert result["env_vars"]["HOME"] == "/root"
        assert result["os"]["name"] == "Linux"

    def test_sensitive_env_vars_redacted(self):
        payload = {
            "env_vars": {
                "DATABASE_URL": "postgres://user:secret@host/db",
                "API_KEY": "supersecret",
                "HOME": "/home/user",
                "SECRET_TOKEN": "abc123",
            }
        }
        result = normalise_env_snapshot(payload)
        assert result["env_vars"]["API_KEY"] == "<redacted>"
        assert result["env_vars"]["SECRET_TOKEN"] == "<redacted>"
        assert result["env_vars"]["HOME"] == "/home/user"  # not sensitive

    def test_pip_freeze_format_parsed(self):
        payload = {
            "packages": "fastapi==0.110.0\nhttpx>=0.26.0\npytest"
        }
        result = normalise_env_snapshot(payload)
        assert any(p["name"] == "fastapi" for p in result["packages"])
        assert any(p["name"] == "pytest" for p in result["packages"])

    def test_dict_packages_format(self):
        payload = {"packages": {"requests": "2.28.0", "numpy": "1.26.0"}}
        result = normalise_env_snapshot(payload)
        names = [p["name"] for p in result["packages"]]
        assert "requests" in names

    def test_language_inferred_from_payload_key(self):
        payload = {"python": "3.11.6"}
        result = normalise_env_snapshot(payload)
        assert result["runtime"]["language"] == "python"

    def test_empty_payload_returns_defaults(self):
        result = normalise_env_snapshot({})
        assert result["packages"] == []
        assert result["env_vars"] == {}
        assert result["active_services"] == []

    def test_raw_preserved(self):
        payload = {"custom_key": "custom_val"}
        result = normalise_env_snapshot(payload)
        assert result["raw"]["custom_key"] == "custom_val"
