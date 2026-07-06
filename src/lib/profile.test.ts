import { describe, it, expect } from "vitest";
import { blankProfileData, DEFAULT_PROFILE, formatAge } from "./store";
import { zodiacFromBirthday } from "./types";
import { fieldToText } from "./fieldDisplay";

describe("blankProfileData", () => {
  it("clears all seeded demo content", () => {
    const b = blankProfileData();
    expect(b.name).toBe("");
    expect(b.whatIDo).toBe(""); // America default was "Global superpower"
    expect(b.achievements).toEqual([]);
    expect(b.hobbies).toEqual([]);
    expect(b.website).toBe(""); // America default was "usa.gov"
    expect(b.avatars).toEqual([]);
    expect(b.customFields).toEqual([]);
    expect(b.photoDataUrl).toBeNull();
  });

  it("keeps structural defaults", () => {
    const b = blankProfileData();
    expect(b.nameFont).toBe(DEFAULT_PROFILE.data.nameFont);
    expect(b.introExtro).toBe(50);
    expect(b.favoriteColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe("zodiacFromBirthday", () => {
  it("maps a July 4 birthday to Cancer", () => {
    expect(zodiacFromBirthday("2000-07-04")).toContain("Cancer");
  });
  it("returns empty string for a missing birthday", () => {
    expect(zodiacFromBirthday("")).toBe("");
  });
});

describe("formatAge", () => {
  it("returns a dash when the birth year is unknown", () => {
    expect(formatAge(null, "exact")).toBe("—");
  });
  it("returns a 5-year range in range mode", () => {
    expect(formatAge(2000, "range")).toContain("–");
  });
});

describe("fieldToText", () => {
  const data = DEFAULT_PROFILE.data;
  it("returns plain string fields directly", () => {
    expect(fieldToText("whatIDo", data)).toBe("Global superpower");
  });
  it("joins list fields with a separator", () => {
    expect(fieldToText("achievements", data)).toContain("Moon");
  });
  it("derives zodiac from the birthday", () => {
    expect(fieldToText("zodiac", data)).toContain("Cancer"); // 1776-07-04
  });
});
