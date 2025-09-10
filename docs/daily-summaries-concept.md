# Context Summaries - Organization Guide

This folder has been reorganized to better separate different types of documentation.

## New Organization Structure

### 📁 `docs/daily-summaries/` - Daily Development Summaries
- **Progress tracking:** Daily accomplishments and discoveries
- **Troubleshooting reference:** Solutions to common problems
- **Configuration documentation:** Environment setup and changes
- **Development history:** Chronological record of project evolution

**Example:** `2025-06-25-azure-ai-travel-agents-setup-and-chaos-agent-vision.md`

## Why This Organization?

- **Clear separation** between daily work and broader concepts
- **Better discoverability** of different types of content
- **Appropriate context** for each type of document
- **Scalable structure** as the project grows

## Usage Guidelines

- **Daily work:** Use `docs/daily-summaries/` for chronological development records
- **Naming:** Follow the established conventions in each folder's README
- **Cross-references:** Link between daily summaries and conceptual ideas when relevant

## Migration

All existing content has been moved to the appropriate new locations:
- ✅ Daily summaries → `docs/daily-summaries/`
- ✅ README files → Updated to reflect new structure

## Naming Convention

Files are named using the format: `YYYY-MM-DD-descriptive-title.md`

Examples:
- `2025-06-25-azure-ai-travel-agents-setup-and-chaos-agent-vision.md`
- `2025-06-26-mcp-tool-integration-troubleshooting.md`
- `2025-07-01-chaos-agent-prototype-development.md`

## Why This Structure?

- **Date-based ordering:** Files sort chronologically in any file browser
- **Descriptive titles:** Easy to find specific topics
- **Markdown format:** Preserves formatting and structure
- **Avoids UI parsing:** Keeps summaries as raw files rather than parsed content

## Usage Guidelines

1. **Create summaries** for significant technical sessions
2. **Include key discoveries** and configuration details
3. **Document future visions** and roadmap items
4. **Preserve troubleshooting steps** that might be needed again
5. **Add to this README** when new summary types are established

---

## ⏰ Timestamped, Event-Typed, and Importance-Tagged Format (2024-06-27+)

To support sliding context windows and more granular recall, all new (and future-adapted) summaries should use the following format for each major event or context block:

### **Summary Entry Template**
```markdown
### [2024-06-27T14:00:00Z] (event_type: migration, importance: high)
- Description of the event, change, or discovery.
- Key details, troubleshooting, or configuration notes.
- Tags: #migration #python #architecture
```

**Fields:**
- `timestamp`: ISO 8601 UTC (e.g., `2024-06-27T14:00:00Z`)
- `event_type`: One of `setup`, `migration`, `bugfix`, `architecture`, `troubleshooting`, `roadmap`, `discussion`, etc.
- `importance`: `normal`, `high`, or `critical`
- `tags`: (optional) for searchability and agent recall

**For prior summaries:**
- If the exact time is unknown, use the summary date at `T23:59:59Z`.
- Adapt older entries to this format as time allows for consistency.

### **Example**
```markdown
### [2024-06-27T09:00:00Z] (event_type: setup, importance: normal)
- Project directory renamed to `azure-ai-multi-agent` to match fork.
- All scripts and documentation updated.
- Tags: #setup #rename

### [2024-06-27T11:30:00Z] (event_type: migration, importance: high)
- Migrated destination-recommendation tool from Java to Python (FastAPI).
- Docker Compose updated, Java directory removed.
- Tags: #migration #python #docker
```

---

## Current Summaries

- `2025-06-25-azure-ai-travel-agents-setup-and-chaos-agent-vision.md` - Initial setup, Dev Container issues, Ollama configuration, and the weird-media chaos agent vision 