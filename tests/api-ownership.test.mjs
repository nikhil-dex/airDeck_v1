// Ownership/security tests for the deck APIs.
// Runs against a live server (default http://localhost:3210):
//   npm run build && PORT=3210 npm start   (in another terminal)
//   npm run test:api
// Sessions are minted with next-auth's own JWT encoder + NEXTAUTH_SECRET,
// so requests are indistinguishable from real signed-in users.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import dns from "node:dns";
import mongoose from "mongoose";
import { encode } from "next-auth/jwt";

if (dns.getServers().every((s) => s === "127.0.0.1" || s === "::1")) {
  dns.setServers(["1.1.1.1", "8.8.8.8"]);
}

const BASE = process.env.TEST_BASE_URL || "http://localhost:3210";
const SECRET = process.env.NEXTAUTH_SECRET;

const OWNER_EMAIL = "owner@pptgen-tests.local";
const OTHER_EMAIL = "other@pptgen-tests.local";
const SLIDE = "<!DOCTYPE html><html><body>test slide</body></html>";

let users, ppts;
let owner, other;
let privateDeckId, sharedDeckId;
let ownerCookie, otherCookie;

async function upsertUser(email, name) {
  await users.updateOne(
    { email },
    {
      $setOnInsert: {
        email,
        name,
        username: email,
        credit: 5,
        ppt_History: [],
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
  return users.findOne({ email });
}

async function sessionCookie(user) {
  const token = await encode({
    token: { email: user.email, name: user.name, sub: String(user._id), id: String(user._id) },
    secret: SECRET,
  });
  return `next-auth.session-token=${token}`;
}

function api(path, { method = "GET", cookie, body } = {}) {
  return fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

before(async () => {
  assert.ok(SECRET, "NEXTAUTH_SECRET must be set (run with --env-file=.env.local)");
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: "ppt_generator",
    serverSelectionTimeoutMS: 15000,
  });
  users = mongoose.connection.db.collection("users");
  ppts = mongoose.connection.db.collection("ppts");

  owner = await upsertUser(OWNER_EMAIL, "Owner Test");
  other = await upsertUser(OTHER_EMAIL, "Other Test");

  const privateDeck = await ppts.insertOne({
    userid: String(owner._id),
    titles: "ownership-test-private",
    ppt_History: [SLIDE],
    sharedWith: [],
    createdAt: new Date(),
  });
  privateDeckId = String(privateDeck.insertedId);

  const sharedDeck = await ppts.insertOne({
    userid: String(owner._id),
    titles: "ownership-test-shared",
    ppt_History: [SLIDE],
    sharedWith: [OTHER_EMAIL],
    createdAt: new Date(),
  });
  sharedDeckId = String(sharedDeck.insertedId);

  ownerCookie = await sessionCookie(owner);
  otherCookie = await sessionCookie(other);
});

after(async () => {
  // Remove everything the tests created (including duplicated copies).
  await ppts.deleteMany({ titles: /^ownership-test/ });
  await users.deleteMany({ email: /@pptgen-tests\.local$/ });
  await mongoose.disconnect();
});

// ── Negative cases: the walls must hold ─────────────────────────────

test("unauthenticated save-ppt is rejected (401)", async () => {
  const res = await api("/api/save-ppt", {
    method: "POST",
    body: { title: "ownership-test-anon", code: [SLIDE] },
  });
  assert.equal(res.status, 401);
});

test("a stranger cannot rename someone else's deck (403)", async () => {
  const res = await api(`/api/ppt/${privateDeckId}`, {
    method: "PATCH",
    cookie: otherCookie,
    body: { title: "hacked" },
  });
  assert.equal(res.status, 403);
});

test("a stranger cannot delete someone else's deck (403)", async () => {
  const res = await api(`/api/ppt/${privateDeckId}`, {
    method: "DELETE",
    cookie: otherCookie,
  });
  assert.equal(res.status, 403);
});

test("only the owner can view a deck's share list (403)", async () => {
  const res = await api(`/api/ppt/${privateDeckId}/share`, {
    cookie: otherCookie,
  });
  assert.equal(res.status, 403);
});

test("a stranger cannot share someone else's deck (403)", async () => {
  const res = await api(`/api/ppt/${privateDeckId}/share`, {
    method: "POST",
    cookie: otherCookie,
    body: { email: "victim@example.com" },
  });
  assert.equal(res.status, 403);
});

test("a stranger cannot duplicate a private deck (403)", async () => {
  const res = await api(`/api/ppt/${privateDeckId}/duplicate`, {
    method: "POST",
    cookie: otherCookie,
  });
  assert.equal(res.status, 403);
});

// ── Positive controls: legitimate access still works ────────────────

test("the owner can rename their own deck (200)", async () => {
  const res = await api(`/api/ppt/${privateDeckId}`, {
    method: "PATCH",
    cookie: ownerCookie,
    body: { title: "ownership-test-private-renamed" },
  });
  assert.equal(res.status, 200);
});

test("a recipient can duplicate a deck shared with them (200)", async () => {
  const res = await api(`/api/ppt/${sharedDeckId}/duplicate`, {
    method: "POST",
    cookie: otherCookie,
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.deck?.id, "duplicate should return the new deck");
});
