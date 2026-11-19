import unittest
from unittest.mock import patch

import sync_notion_docs as exporter


def rich_text(value):
    return [{"plain_text": value, "annotations": {}}]


def block(block_type, value, **extra):
    payload = {"rich_text": rich_text(value)}
    payload.update(extra)
    return {
        "id": extra.pop("id", "block-id") if "id" in extra else "block-id",
        "type": block_type,
        block_type: payload,
        "has_children": extra.get("has_children", False),
    }


class RenderTests(unittest.TestCase):
    def test_checked_and_unchecked_to_do_blocks_render_as_github_tasks(self):
        blocks = [
            {
                "id": "checked",
                "type": "to_do",
                "to_do": {"checked": True, "rich_text": rich_text("Approved")},
                "has_children": False,
            },
            {
                "id": "unchecked",
                "type": "to_do",
                "to_do": {"checked": False, "rich_text": rich_text("Pending")},
                "has_children": False,
            },
        ]

        self.assertEqual(
            exporter.render(blocks),
            "- [x] Approved\n\n- [ ] Pending",
        )

    def test_numbered_lists_use_sequential_numbers_and_restart(self):
        blocks = [
            {"type": "numbered_list_item", "numbered_list_item": {"rich_text": rich_text("First")}},
            {"type": "numbered_list_item", "numbered_list_item": {"rich_text": rich_text("Second")}},
            {"type": "paragraph", "paragraph": {"rich_text": rich_text("Break")}},
            {"type": "numbered_list_item", "numbered_list_item": {"rich_text": rich_text("Restart")}},
        ]

        self.assertEqual(
            exporter.render(blocks),
            "1. First\n\n2. Second\n\nBreak\n\n1. Restart",
        )

    def test_nested_task_children_are_indented(self):
        parent = {
            "id": "parent",
            "type": "to_do",
            "to_do": {"checked": False, "rich_text": rich_text("Parent task")},
            "has_children": True,
        }
        child = {
            "id": "child",
            "type": "bulleted_list_item",
            "bulleted_list_item": {"rich_text": rich_text("Child detail")},
            "has_children": False,
        }

        with patch.object(exporter, "children", return_value=[child]):
            rendered = exporter.render([parent])

        self.assertEqual(rendered, "- [ ] Parent task\n\n  - Child detail")

    def test_unknown_block_type_emits_warning(self):
        unknown = {"id": "unknown-id", "type": "future_block", "future_block": {}}

        with self.assertWarnsRegex(
            RuntimeWarning, "Unsupported Notion block type 'future_block'"
        ):
            rendered = exporter.render([unknown])

        self.assertEqual(rendered, "")


if __name__ == "__main__":
    unittest.main()
