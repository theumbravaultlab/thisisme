import { describe, it, expect } from "vitest";
import { buildPublicPayload, generateHandle } from "./share";
import { DEFAULT_PROFILE } from "./store";
import type { Profile } from "./types";

// A profile where every field has a value, so any leak would be visible.
function fullProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    ...DEFAULT_PROFILE,
    ...overrides,
    data: {
      ...DEFAULT_PROFILE.data,
      name: "Jane Doe",
      phone: "555-0100",
      email: "jane@example.com",
      whatIDo: "Engineer",
      religion: "Christianity",
      bibleVerse: "John 3:16",
      avatars: ["data:image/png;base64,SECRET"],
      customFields: [
        { id: "c1", label: "Secret", emoji: "🤫", value: "hidden", categoryKey: "Life", visible: false },
        { id: "c2", label: "Blog", emoji: "📝", value: "myblog.com", categoryKey: "Contact Info", visible: true },
      ],
      ...overrides.data,
    },
  };
}

describe("buildPublicPayload — leak-proofing", () => {
  it("omits values for fields the owner did not make visible", () => {
    const profile = fullProfile({
      data: { ...fullProfile().data, phone: "555-0100" },
      visibility: { ...DEFAULT_PROFILE.visibility, whatIDo: true, phone: false, email: false },
    });
    const pub = buildPublicPayload(profile);

    expect(pub.data.whatIDo).toBe("Engineer"); // shared
    expect(pub.data.phone).toBe(""); // not shared → wiped, not leaked
    expect(pub.data.email).toBe("");
    expect(pub.visibility.phone).toBe(false);
    expect(pub.visibility.whatIDo).toBe(true);
  });

  it("never exposes the private avatar library or custom categories wholesale", () => {
    const profile = fullProfile({
      visibility: { ...DEFAULT_PROFILE.visibility },
    });
    const pub = buildPublicPayload(profile);
    expect(pub.data.avatars).toEqual([]);
    // Only visible custom fields survive; the hidden one is dropped entirely.
    expect(pub.data.customFields.find((f) => f.id === "c1")).toBeUndefined();
  });

  it("shares a visible custom field but drops a hidden one", () => {
    const profile = fullProfile();
    const pub = buildPublicPayload(profile);
    const blog = pub.data.customFields.find((f) => f.value === "myblog.com");
    expect(blog).toBeDefined();
    expect(pub.data.customFields.some((f) => f.value === "hidden")).toBe(false);
  });

  it("only shares Favorite Bible Verse when religion is Christianity", () => {
    const shared = buildPublicPayload(
      fullProfile({
        visibility: { ...DEFAULT_PROFILE.visibility, religion: true, bibleVerse: true },
      })
    );
    expect(shared.data.bibleVerse).toBe("John 3:16");

    const other = buildPublicPayload(
      fullProfile({
        data: { ...fullProfile().data, religion: "Buddhism", bibleVerse: "John 3:16" },
        visibility: { ...DEFAULT_PROFILE.visibility, religion: true, bibleVerse: true },
      })
    );
    expect(other.data.bibleVerse).toBe(""); // conditional field doesn't apply
  });

  it("always carries identity/branding fields", () => {
    const pub = buildPublicPayload(fullProfile());
    expect(pub.data.name).toBe("Jane Doe");
    expect(pub.data.share.enabled).toBe(false); // share settings never exposed
  });
});

describe("generateHandle", () => {
  it("produces a valid handle from a name", () => {
    const h = generateHandle("Jane Doe!!");
    expect(h).toMatch(/^[a-z0-9_]{3,20}$/);
    expect(h.startsWith("janedoe")).toBe(true);
  });

  it("falls back to 'user' when the name has no usable characters", () => {
    expect(generateHandle("!!!").startsWith("user_")).toBe(true);
  });
});
