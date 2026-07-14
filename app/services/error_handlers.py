from __future__ import annotations


class PDFExtractionError(Exception):
    """Raised when a PDF is corrupted, empty, or has no extractable text layer."""


class URLFetchError(Exception):
    """Raised when a target URL is unreachable, times out, or returns a non-200 status."""


class TemplateError(Exception):
    """Raised when a template DOCX is missing or corrupted."""


class ClaudeAPIError(Exception):
    """Raised when a Claude API call fails (auth, timeout, or retries exhausted)."""
