import test from "node:test";
import assert from "node:assert/strict";
import { healthLessons } from "./healthLessons.js";

test("essential health lessons have complete Hindi translations and references", () => {
  const essentialTitles = [
    "PCOS and PCOD: understanding the terms",
    "My first period",
    "Irregular periods: making sense of timing",
    "Endometriosis: symptoms deserve attention",
    "The menstrual cycle: a simple guide",
    "Period hygiene and choosing products",
    "Cramps, fatigue, headaches and mood changes",
    "Common menstrual variations",
    "Preparing for a healthcare appointment",
  ];

  for (const title of essentialTitles) {
    const lesson = healthLessons.find((item) => item.title === title);
    assert.ok(lesson, `Missing essential lesson: ${title}`);
    assert.ok(lesson.hindi?.title, `Missing Hindi title: ${title}`);
    assert.ok(lesson.hindi?.description, `Missing Hindi description: ${title}`);
    assert.ok(lesson.hindi?.intro, `Missing Hindi introduction: ${title}`);
    assert.equal(lesson.hindi?.sections.length, lesson.sections.length, `Hindi sections incomplete: ${title}`);
    assert.ok(lesson.hindi?.sections.every(([heading, body]) => heading && body), `Empty Hindi section: ${title}`);
    assert.ok(lesson.hindi?.takeaway, `Missing Hindi takeaway: ${title}`);
    assert.match(lesson.source.url, /^https:\/\//, `Missing secure source URL: ${title}`);
  }
});

test("health lessons use known categories and unique titles", () => {
  const categories = new Set(["Basics", "Symptoms", "Hygiene", "Wellbeing", "Medical Guidance"]);
  const titles = healthLessons.map((lesson) => lesson.title);

  assert.equal(new Set(titles).size, titles.length);
  for (const lesson of healthLessons) {
    assert.ok(categories.has(lesson.category), `Unknown category: ${lesson.category}`);
    assert.ok(lesson.keywords.trim(), `Missing search keywords: ${lesson.title}`);
    assert.ok(lesson.source.organisation && lesson.source.title, `Missing source citation: ${lesson.title}`);
  }
});

test("menstrual cycle lesson exposes the illustration used by the Learn page", () => {
  const lesson = healthLessons.find((item) => item.illustration === "cycle");

  assert.equal(lesson?.title, "The menstrual cycle: a simple guide");
});
