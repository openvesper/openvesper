import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>PDF Tool</h1>
      <p className="lead">
        Read text from local PDF files, search inside PDFs, get metadata.
        Operates on filesystem only — no uploads.
      </p>

      <h2>Tools provided</h2>

      <h3>pdf_read</h3>
      <p>Extract all text from a PDF.</p>
      <pre><code>{`{
  "tool": "pdf_read",
  "input": {
    "file_path": "/path/to/report.pdf",
    "max_pages": 50  // optional limit (0 = all)
  }
}`}</code></pre>

      <h3>pdf_search</h3>
      <p>Find text within a PDF, returns surrounding context per match.</p>
      <pre><code>{`{
  "tool": "pdf_search",
  "input": {
    "file_path": "/path/to/report.pdf",
    "query": "valuation method",
    "context_chars": 100  // chars of context per match
  }
}`}</code></pre>

      <h3>pdf_metadata</h3>
      <p>Page count, info dict, file size — without parsing full text.</p>
      <pre><code>{`{
  "tool": "pdf_metadata",
  "input": { "file_path": "/path/to/report.pdf" }
}`}</code></pre>

      <h2>Output (pdf_read)</h2>
      <pre><code>{`{
  "success": true,
  "data": {
    "file": "/abs/path/report.pdf",
    "pageCount": 42,
    "textLength": 84200,
    "info": { "Title": "...", "Author": "..." },
    "text": "Full extracted text..."
  }
}`}</code></pre>

      <h2>Privacy</h2>
      <p>
        PDFs read from your local filesystem. The agent's filesystem sandbox
        rules still apply. Nothing uploaded.
      </p>

      <h2>Source</h2>
      <p>Implementation: <code>packages/plugins/pdf/</code> (uses <code>pdf-parse</code>)</p>
    </div>
  );
}
