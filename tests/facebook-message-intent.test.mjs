import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FACEBOOK_MESSAGE_INTENTS,
  FACEBOOK_WELCOME_MESSAGE,
  buildFacebookIntentReply,
  buildFacebookResponseSequence,
  classifyFacebookMessageIntent,
  detectFacebookMessageLanguage,
} from '../src/social/facebook-message-automation.js';

const classify = (text) => classifyFacebookMessageIntent(text);

test('uses the approved short bilingual welcome message', () => {
  assert.match(FACEBOOK_WELCOME_MESSAGE, /^Hi! 👋 Welcome to Car Daddy By Torres\./);
  assert.match(FACEBOOK_WELCOME_MESSAGE, /Español también disponible\.$/);
  assert.ok(FACEBOOK_WELCOME_MESSAGE.length < 350);
});

test('detects Spanish and English without sending both languages', () => {
  assert.equal(detectFacebookMessageLanguage('Necesito servicio para mi carro'), 'es');
  assert.equal(detectFacebookMessageLanguage('I need service for my car'), 'en');
});

test('keeps intent language independent across customer and provider messages', () => {
  const spanishCustomer = buildFacebookResponseSequence('Mi Toyota no prende y necesito un mecánico');
  const englishProvider = buildFacebookResponseSequence("I'm a diesel mechanic looking for extra jobs");
  const englishCustomer = buildFacebookResponseSequence("My Nissan won't start and I need a mechanic");
  const spanishProvider = buildFacebookResponseSequence('Soy mecánico y quiero unirme a la red');

  assert.equal(spanishCustomer.classification.intent, FACEBOOK_MESSAGE_INTENTS.SERVICE_REQUEST);
  assert.equal(spanishCustomer.classification.language, 'es');
  assert.match(spanishCustomer.replies[0], /\/es\/solicitar-servicio\?/);

  assert.equal(englishProvider.classification.intent, FACEBOOK_MESSAGE_INTENTS.PROVIDER_INTEREST);
  assert.equal(englishProvider.classification.language, 'en');
  assert.match(englishProvider.replies[0], /pages\.dev\/unete-a-la-red\?/);
  assert.doesNotMatch(englishProvider.replies[0], /pages\.dev\/es\/unete-a-la-red/);

  assert.equal(englishCustomer.classification.intent, FACEBOOK_MESSAGE_INTENTS.SERVICE_REQUEST);
  assert.equal(englishCustomer.classification.language, 'en');
  assert.match(englishCustomer.replies[0], /pages\.dev\/solicitar-servicio\?/);
  assert.doesNotMatch(englishCustomer.replies[0], /pages\.dev\/es\/solicitar-servicio/);

  assert.equal(spanishProvider.classification.intent, FACEBOOK_MESSAGE_INTENTS.PROVIDER_INTEREST);
  assert.equal(spanishProvider.classification.language, 'es');
  assert.match(spanishProvider.replies[0], /\/es\/unete-a-la-red\?/);
});

test('recognizes natural-language provider interest', () => {
  for (const message of [
    "I'm a diesel mechanic looking for extra jobs",
    'Are you hiring mechanics?',
    'I want to work with CarDaddy',
    'Soy mecánico y busco trabajo',
    'Quiero unirme a la red como proveedor',
    'MECHANIC',
    'MECÁNICO',
  ]) {
    assert.equal(classify(message).intent, FACEBOOK_MESSAGE_INTENTS.PROVIDER_INTEREST, message);
  }
});

test('distinguishes customers who need a mechanic from mechanics seeking work', () => {
  for (const message of [
    'I need a mechanic',
    "I have a 2015 Nissan that won't start",
    'Looking for a mobile mechanic',
    'Necesito un mecánico',
    'Mi carro no prende',
    'Necesito servicio',
  ]) {
    assert.equal(classify(message).intent, FACEBOOK_MESSAGE_INTENTS.SERVICE_REQUEST, message);
  }
});

test('recognizes coverage questions without promising coverage', () => {
  for (const message of [
    'Do you have mechanics around Jackson?',
    'Do you service my area?',
    '¿Tienen mecánicos cerca de Gulfport?',
    '¿Cubren mi área?',
  ]) {
    const result = classify(message);
    assert.equal(result.intent, FACEBOOK_MESSAGE_INTENTS.SERVICE_AREA_QUESTION, message);
    assert.doesNotMatch(buildFacebookIntentReply(result), /we (?:do|will) cover/i);
  }
});

test('answers general information with a single next action', () => {
  const result = classify('How does this work?');
  assert.equal(result.intent, FACEBOOK_MESSAGE_INTENTS.GENERAL_INFORMATION);
  assert.equal(result.topic, 'how_it_works');
  assert.match(buildFacebookIntentReply(result), /solicitar-servicio/);
});

test('asks a short clarifying question for unclear greetings', () => {
  const english = buildFacebookIntentReply(classify('Hello'));
  const spanish = buildFacebookIntentReply(classify('Buenas tardes'));
  assert.match(english, /vehicle service/);
  assert.match(spanish, /servicio para tu vehículo/);
});

test('can prepend the welcome while keeping intent classification separate', () => {
  const result = buildFacebookResponseSequence('My brakes need help', { includeWelcome: true });
  assert.equal(result.classification.intent, FACEBOOK_MESSAGE_INTENTS.SERVICE_REQUEST);
  assert.equal(result.replies[0], FACEBOOK_WELCOME_MESSAGE);
  assert.equal(result.replies.length, 2);
  assert.match(result.replies[1], /advance payment/);
});
