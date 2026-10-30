import type { On, ToolCallResult } from 'claude-code'
import type { TestBody } from 'claude-code/testing'
import { expect, mock, test } from 'claude-code/testing'
import { TIMEOUT_REPLY } from '../hooks/register'

const MINUTE = 60_000

const QUESTIONS = [
  {
    question: 'Which library should we use?',
    header: 'Library',
    multiSelect: false,
    options: [
      { label: 'A (Recommended)', description: 'first' },
      { label: 'B', description: 'second' },
    ],
  },
  {
    question: 'Which features?',
    header: 'Features',
    multiSelect: true,
    options: [
      { label: 'X', description: 'x' },
      { label: 'Y', description: 'y' },
    ],
  },
]

// Stands for the engine's dialog: open until the test answers or the call aborts.
const dialog = (on: On) => {
  const state = { isOpen: false, isAborted: false, answer: (_: ToolCallResult) => {} }
  on('tool.call', { tool: 'AskUserQuestion' }, (_, __, next) => {
    state.isOpen = true
    next.signal.addEventListener('abort', () => {
      state.isAborted = true
    })
    return new Promise<ToolCallResult>(resolve => {
      state.answer = resolve
    })
  })
  return state
}

const ask = ($: Parameters<TestBody>[0]) =>
  $.tool.call({ tool: 'AskUserQuestion', questions: QUESTIONS })

test('no answer by the default 15 minutes: every question gets the reply and the dialog is aborted', async ($, on) => {
  const clock = mock.clock(on)
  const engine = dialog(on)
  let settled: ToolCallResult | undefined

  void ask($).then(r => {
    settled = r as ToolCallResult
  })
  await clock.settle()
  expect(engine.isOpen).toBe(true)

  await clock.advance(15 * MINUTE - 1)
  expect(settled).toBeUndefined()
  expect(engine.isAborted).toBe(false)

  await clock.advance(1)
  expect(settled?.result).toEqual({
    questions: QUESTIONS,
    answers: {
      'Which library should we use?': TIMEOUT_REPLY,
      'Which features?': TIMEOUT_REPLY,
    },
    afkTimeoutMs: 15 * MINUTE,
  })
  expect(engine.isAborted).toBe(true)
})

test('the person answers in time: their answer stands and the timer never fires', async ($, on) => {
  const clock = mock.clock(on)
  const engine = dialog(on)
  const human = {
    result: { questions: QUESTIONS, answers: { 'Which library should we use?': 'B', 'Which features?': 'X, Y' } },
  } as ToolCallResult
  let settled: ToolCallResult | undefined

  void ask($).then(r => {
    settled = r as ToolCallResult
  })
  await clock.advance(5 * MINUTE)
  engine.answer(human)
  await clock.settle()
  expect(settled?.result).toEqual(human.result)

  await clock.advance(30 * MINUTE)
  expect(settled?.result).toEqual(human.result)
  expect(engine.isAborted).toBe(false)
})

test('a configured timeout is used', { options: { timeoutMinutes: 2 } }, async ($, on) => {
  const clock = mock.clock(on)
  dialog(on)
  let settled: ToolCallResult | undefined

  void ask($).then(r => {
    settled = r as ToolCallResult
  })
  await clock.advance(2 * MINUTE - 1)
  expect(settled).toBeUndefined()
  await clock.advance(1)
  expect(settled?.result).toMatchObject({ afkTimeoutMs: 2 * MINUTE })
})

test('timeout 0 is off: the dialog waits indefinitely', { options: { timeoutMinutes: 0 } }, async ($, on) => {
  const clock = mock.clock(on)
  const engine = dialog(on)
  let settled: ToolCallResult | undefined

  void ask($).then(r => {
    settled = r as ToolCallResult
  })
  await clock.advance(24 * 60 * MINUTE)
  expect(settled).toBeUndefined()
  expect(engine.isAborted).toBe(false)
})
